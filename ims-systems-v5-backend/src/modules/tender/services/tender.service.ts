/**
 * Tender Autopilot application service.
 */
import type { Authorizer, SecurityIdentity } from "../../../security";
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationAppError,
} from "../../../shared";
import {
  buildAuditorPackHtml,
  buildAuditorPackPdf,
} from "../lib/auditor-pack";
import { buildTenderSubmissionEmail } from "../lib/mail";
import {
  parseUpload,
  writeCsv,
  writeDocx,
  writeXlsx,
  type DocxBlock,
} from "../lib/office-io";
import {
  accept,
  addPackDocument,
  analyseDocument,
  approve,
  autoAssess,
  assessRequirement,
  bidBlocks,
  byId,
  canSubmit,
  draft,
  draftAll,
  exportBlocks,
  exportRows,
  fitToLimit,
  fromParagraphs,
  fromRows,
  fromText,
  gate,
  isStale,
  iso,
  libraryHealth,
  limitUsage,
  markSubmitted,
  newQuestionnaire,
  pricingFromRows,
  pricingRows,
  qStatus,
  recordExport,
  removeAnswer,
  removeItem,
  setAnswer,
  setPricing,
  stats,
  submissionPackage,
  today,
  updateBid,
  updateFacts,
  updateSettings,
  upsertAnswer,
  upsertCase,
  upsertCertificate,
  upsertPolicy,
  upsertRate,
  upsertService,
  buildIndex,
  fillFacts,
  type NewQuestionnaireMeta,
} from "../lib/tender-rules";
import {
  storageInfoFromFileId,
  storageInfoFromMeta,
  type DocumentModuleLibraryPort,
} from "../../document-management";
import type {
  TenderAlicePort,
  TenderEmailPort,
  TenderFilesPort,
  TenderNotificationPort,
  TenderOrgPort,
  TenderUsersPort,
} from "../ports";
import type { TenderAnswerRepository } from "../repositories/tender-answer.repository";
import type { TenderAuditLogRepository } from "../repositories/tender-audit-log.repository";
import type { TenderCaseRepository } from "../repositories/tender-case.repository";
import type { TenderCertificateRepository } from "../repositories/tender-certificate.repository";
import type { TenderPolicyRepository } from "../repositories/tender-policy.repository";
import type { TenderQuestionnaireRepository } from "../repositories/tender-questionnaire.repository";
import type { TenderRateRepository } from "../repositories/tender-rate.repository";
import type { TenderServiceRepository } from "../repositories/tender-service.repository";
import type { TenderSettingsRepository } from "../repositories/tender-settings.repository";
import {
  TENDER_RESOURCE,
  type TenderDraftResult,
  type TenderFacts,
  type TenderFileMeta,
  type TenderLibraryAnswer,
  type TenderLogEntry,
  type TenderParsedRows,
  type TenderQuestion,
  type TenderQuestionnaire,
  type TenderRulesModel,
  type TenderSettings,
  type TenderSourceHit,
} from "../types";

type MaybeIdentity = SecurityIdentity | null | undefined;

function requireOrgIdentity(identity: MaybeIdentity): {
  identity: SecurityIdentity;
  organizationId: string;
  subjectId: string;
} {
  if (!identity?.subjectId) throw new UnauthorizedError();
  if (!identity.organizationId) {
    throw new ForbiddenError("Organisation context is required");
  }
  return {
    identity,
    organizationId: identity.organizationId,
    subjectId: identity.subjectId,
  };
}

function actorName(identity: SecurityIdentity): string {
  return identity.email?.trim() || identity.subjectId || "System";
}

function settingsSlice(row: {
  reviewMonths: number;
  approvers: string[];
  tone: string;
  minConfidence: number;
  certWarnDays: number;
  learn: boolean;
  submissionCc: string;
  fromEmail: string;
}): TenderSettings {
  return {
    reviewMonths: row.reviewMonths,
    approvers: [...row.approvers],
    tone: row.tone,
    minConfidence: row.minConfidence,
    certWarnDays: row.certWarnDays,
    learn: row.learn,
    submissionCc: row.submissionCc,
    fromEmail: row.fromEmail,
  };
}

function isApprover(
  settings: TenderSettings,
  identity: SecurityIdentity
): boolean {
  if (!settings.approvers?.length) return true;
  const email = identity.email?.trim().toLowerCase() || "";
  const subject = identity.subjectId?.trim().toLowerCase() || "";
  return settings.approvers.some((a) => {
    const v = String(a || "")
      .trim()
      .toLowerCase();
    return v && (v === email || v === subject);
  });
}

async function assertApproverOrCreate(
  assertAllowed: (
    identity: SecurityIdentity,
    action: "read" | "create" | "delete"
  ) => Promise<void>,
  identity: SecurityIdentity,
  settings: TenderSettings
): Promise<void> {
  if (isApprover(settings, identity)) {
    await assertAllowed(identity, "create");
    return;
  }
  throw new ForbiddenError("Only an approver can perform this action");
}

export type TenderServiceDeps = {
  settings: TenderSettingsRepository;
  answers: TenderAnswerRepository;
  certificates: TenderCertificateRepository;
  policies: TenderPolicyRepository;
  services: TenderServiceRepository;
  cases: TenderCaseRepository;
  rates: TenderRateRepository;
  questionnaires: TenderQuestionnaireRepository;
  auditLog: TenderAuditLogRepository;
  authorizer: Authorizer;
  email: TenderEmailPort;
  files: TenderFilesPort;
  org: TenderOrgPort;
  users: TenderUsersPort;
  notifications: TenderNotificationPort;
  alice: TenderAlicePort;
  documents: DocumentModuleLibraryPort;
};

export type TenderService = ReturnType<typeof createTenderService>;

export type TenderLibrarySyncResult = {
  scanned: number;
  created: number;
  existing: number;
  failed: number;
};

export function createTenderService(deps: TenderServiceDeps) {
  async function registerTenderLibraryFile(input: {
    organizationId: string;
    createdBy: string;
    sourceKey: string;
    name: string;
    folderName: "Certificates" | "Policies";
    fileMeta?: {
      Name?: string | null;
      Key?: string | null;
      key?: string | null;
      Bucket?: string | null;
      Size?: number | null;
    } | null;
    fileId?: string | null;
    fileName?: string | null;
    reviewDate?: string | null;
  }): Promise<"created" | "existing" | "skipped" | "failed"> {
    const storageInfo =
      storageInfoFromMeta(input.fileMeta) ||
      storageInfoFromFileId(input.fileId, input.fileName);
    if (!storageInfo) return "skipped";
    try {
      const result = await deps.documents.registerDocument({
        organizationId: input.organizationId,
        createdBy: input.createdBy,
        sourceModule: "tender",
        sourceKey: input.sourceKey,
        name: input.name,
        storageInfo,
        purpose: input.folderName === "Policies" ? "Policy" : "Document",
        reviewDate: input.reviewDate || null,
        sourceLabel: input.name,
        folderName: input.folderName,
      });
      if (!result) return "skipped";
      return result.created ? "created" : "existing";
    } catch {
      // Non-fatal — tender write already succeeded.
      return "failed";
    }
  }

  function queueTenderLibraryFile(
    input: Parameters<typeof registerTenderLibraryFile>[0]
  ): void {
    void registerTenderLibraryFile(input);
  }

  async function assertAllowed(
    identity: SecurityIdentity,
    action: "read" | "create" | "delete",
    resourceId?: string
  ): Promise<void> {
    const allowed = await deps.authorizer.allow({
      identity,
      action,
      resourceType: TENDER_RESOURCE,
      resourceId,
      organizationId: identity.organizationId,
    });
    if (!allowed) {
      throw new ForbiddenError(
        "User does not have permission to access tender"
      );
    }
  }

  async function loadRulesModel(
    organizationId: string
  ): Promise<TenderRulesModel> {
    const [
      settingsRow,
      answers,
      certificates,
      policies,
      services,
      cases,
      rates,
      questionnaires,
      log,
      orgName,
    ] = await Promise.all([
      deps.settings.getOrCreate(organizationId),
      deps.answers.list(organizationId),
      deps.certificates.list(organizationId),
      deps.policies.list(organizationId),
      deps.services.list(organizationId),
      deps.cases.list(organizationId),
      deps.rates.list(organizationId),
      deps.questionnaires.list(organizationId),
      deps.auditLog.listRecent(organizationId, 400),
      deps.org.getOrganizationName(organizationId),
    ]);

    return {
      org: orgName,
      settings: settingsSlice(settingsRow),
      facts: { ...settingsRow.facts },
      library: {
        answers,
        certificates,
        policies,
        services,
        cases,
        rates,
      },
      questionnaires,
      log: [...log],
    };
  }

  async function persistLogDelta(
    organizationId: string,
    before: TenderLogEntry[],
    after: TenderLogEntry[]
  ): Promise<void> {
    const beforeKeys = new Set(before.map((e) => `${e.t}|${e.by}|${e.what}`));
    const added = after.filter(
      (e) => !beforeKeys.has(`${e.t}|${e.by}|${e.what}`)
    );
    if (added.length) {
      await deps.auditLog.appendMany(organizationId, added);
    }
  }

  async function persistQuestionnaire(
    organizationId: string,
    q: TenderQuestionnaire
  ): Promise<TenderQuestionnaire> {
    return deps.questionnaires.upsert(organizationId, q);
  }

  async function persistLibraryAnswers(
    organizationId: string,
    answers: TenderLibraryAnswer[]
  ): Promise<void> {
    for (const a of answers) {
      await deps.answers.upsert(organizationId, a);
    }
  }

  async function requireQuestionnaire(
    organizationId: string,
    id: string
  ): Promise<TenderQuestionnaire> {
    const q = await deps.questionnaires.findByEntityId(organizationId, id);
    if (!q) throw new NotFoundError("Questionnaire not found");
    return q;
  }

  async function enhanceDraftWithAlice(
    M: TenderRulesModel,
    q: TenderQuestion,
    base: TenderDraftResult,
    questionnaire?: TenderQuestionnaire
  ): Promise<TenderDraftResult> {
    if (!base.sources.length) return base;

    const context = base.sources
      .map((s: TenderSourceHit, i: number) => {
        if (s.kind === "answer") {
          const a = byId(M.library.answers, s.id);
          if (!a) return null;
          return {
            i,
            kind: s.kind,
            label: s.label,
            text: fillFacts(a.answer, M.facts),
            approvedAt: a.approvedAt || null,
            reviewBy: a.reviewBy || null,
            stale: !!(a.reviewBy && a.reviewBy < iso(today())),
          };
        }
        if (s.kind === "policy") {
          const p = byId(M.library.policies, s.id);
          if (!p) return null;
          return {
            i,
            kind: s.kind,
            label: s.label,
            text: `${p.name} (${p.ref || ""} v${p.version || ""}, reviewed ${p.reviewed || ""}, owner ${p.owner || ""}). ${p.summary || ""}`,
            approvedAt: null,
            reviewBy: null,
            stale: false,
          };
        }
        if (s.kind === "certificate") {
          const c = byId(M.library.certificates, s.id);
          if (!c) return null;
          return {
            i,
            kind: s.kind,
            label: s.label,
            text: `${c.name}, ${c.body || ""} ${c.number || ""}, scope: ${c.scope || ""}, valid ${c.issued || ""} to ${c.expires || ""}`,
            approvedAt: null,
            reviewBy: null,
            stale: false,
          };
        }
        return null;
      })
      .filter(Boolean) as Array<{
      i: number;
      kind: string;
      label: string;
      text: string;
      approvedAt: string | null;
      reviewBy: string | null;
      stale: boolean;
    }>;

    if (!context.length) return base;

    const L =
      q.limit ||
      (q.wordLimit
        ? { kind: "words" as const, n: q.wordLimit, spaces: null }
        : null);

    const alice = await deps.alice.run("draft", {
      tenant: M.org,
      tone: M.settings.tone,
      question: {
        ref: q.ref || "",
        text: q.text,
        type: base.type,
        section: q.section || "",
        limit: L,
      },
      criteria: questionnaire?.criteria || [],
      buyer: {
        name: questionnaire?.buyer || "",
        reference: questionnaire?.reference || "",
      },
      facts: M.facts,
      context,
      previous:
        q.answer && q.status === "edited" ? { answer: q.answer } : null,
      limit: L,
    });

    if (!alice || typeof alice.answer !== "string" || !alice.answer.trim()) {
      return base;
    }

    let answer = String(alice.answer).trim();
    let confidence = Math.max(
      0,
      Math.min(0.97, Number(alice.confidence) || base.confidence)
    );
    const gaps = Array.isArray(alice.gaps)
      ? alice.gaps.map(String)
      : ([] as string[]);
    const fit = fitToLimit(answer, L);
    answer = fit.answer;
    if (fit.trimmed) confidence -= 0.05;

    const used = Array.isArray(alice.usedContext)
      ? (alice.usedContext as number[])
          .filter((i) => context[i])
          .map((i) => base.sources[i]!)
          .filter(Boolean)
      : base.sources;

    return {
      answer,
      confidence: Math.round(confidence * 100) / 100,
      sources: used.length ? used : base.sources,
      type: base.type,
      trimmed: fit.trimmed,
      usage: limitUsage(answer, L),
      status:
        answer &&
        !gaps.length &&
        confidence >= (M.settings.minConfidence ?? 0.55)
          ? "draft"
          : "needs-input",
    };
  }

  async function draftQuestionsFor(
    M: TenderRulesModel,
    qid: string,
    only?: string[] | null
  ): Promise<number> {
    const Q = byId(M.questionnaires, qid);
    if (!Q) throw new NotFoundError("Questionnaire not found");
    const index = buildIndex(M);
    let n = 0;
    for (const q of Q.questions) {
      if (only && !only.includes(q.id)) continue;
      if (["accepted", "approved", "edited"].includes(q.status)) continue;
      const base = draft(M, q, index);
      const d = await enhanceDraftWithAlice(M, q, base, Q);
      Object.assign(q, {
        answer: d.answer,
        confidence: d.confidence,
        sources: d.sources,
        type: q.type || d.type,
        status: d.status,
      });
      n++;
    }
    if (!n) {
      const r = draftAll(M, qid, "ALICE", null, only || null);
      return r.drafted;
    }
    Q.status = qStatus(Q);
    M.log.unshift({
      t: new Date().toISOString(),
      by: "ALICE",
      what: `Drafted ${n} answers for ${Q.buyer} · ${Q.title}`,
    });
    return n;
  }

  /* ---------------- public API ---------------- */

  async function getSettings(identity: MaybeIdentity) {
    const { identity: id, organizationId } = requireOrgIdentity(identity);
    await assertAllowed(id, "read");
    const row = await deps.settings.getOrCreate(organizationId);
    return { ...settingsSlice(row), facts: row.facts };
  }

  async function updateSettingsService(
    identity: MaybeIdentity,
    input: Partial<TenderSettings>
  ) {
    const { identity: id, organizationId } = requireOrgIdentity(identity);
    await assertAllowed(id, "create");
    const M = await loadRulesModel(organizationId);
    const beforeLog = [...M.log];
    const settings = updateSettings(M, input, actorName(id));
    await deps.settings.update(organizationId, settings, id.subjectId);
    await persistLogDelta(organizationId, beforeLog, M.log);
    return settings;
  }

  async function updateFactsService(
    identity: MaybeIdentity,
    facts: TenderFacts
  ) {
    const { identity: id, organizationId } = requireOrgIdentity(identity);
    await assertAllowed(id, "create");
    const M = await loadRulesModel(organizationId);
    const beforeLog = [...M.log];
    const next = updateFacts(M, facts, actorName(id));
    await deps.settings.updateFacts(organizationId, next, id.subjectId);
    await persistLogDelta(organizationId, beforeLog, M.log);
    return next;
  }

  async function getLibraryHealth(identity: MaybeIdentity) {
    const { identity: id, organizationId } = requireOrgIdentity(identity);
    await assertAllowed(id, "read");
    const M = await loadRulesModel(organizationId);
    return libraryHealth(M);
  }

  async function overview(identity: MaybeIdentity) {
    const { identity: id, organizationId } = requireOrgIdentity(identity);
    await assertAllowed(id, "read");
    const M = await loadRulesModel(organizationId);
    return stats(M);
  }

  async function getLog(identity: MaybeIdentity) {
    const { identity: id, organizationId } = requireOrgIdentity(identity);
    await assertAllowed(id, "read");
    return deps.auditLog.listRecent(organizationId, 200);
  }

  async function listLibrary(
    identity: MaybeIdentity,
    kind:
      | "answers"
      | "certificates"
      | "policies"
      | "services"
      | "cases"
      | "rates"
  ) {
    const { identity: id, organizationId } = requireOrgIdentity(identity);
    await assertAllowed(id, "read");
    const M = await loadRulesModel(organizationId);
    return M.library[kind];
  }

  async function upsertLibraryAnswer(
    identity: MaybeIdentity,
    body: Record<string, unknown>
  ) {
    const { identity: id, organizationId } = requireOrgIdentity(identity);
    await assertAllowed(id, "create");
    const M = await loadRulesModel(organizationId);
    const beforeLog = [...M.log];
    const a = upsertAnswer(M, body, actorName(id));
    await deps.answers.upsert(organizationId, a);
    await persistLogDelta(organizationId, beforeLog, M.log);
    return a;
  }

  async function deleteLibraryAnswer(
    identity: MaybeIdentity,
    answerId: string
  ) {
    const { identity: id, organizationId } = requireOrgIdentity(identity);
    await assertAllowed(id, "delete");
    const M = await loadRulesModel(organizationId);
    const beforeLog = [...M.log];
    removeAnswer(M, answerId, actorName(id));
    await deps.answers.remove(organizationId, answerId);
    await persistLogDelta(organizationId, beforeLog, M.log);
  }

  async function upsertLibraryCertificate(
    identity: MaybeIdentity,
    body: Record<string, unknown>
  ) {
    const { identity: id, organizationId, subjectId } =
      requireOrgIdentity(identity);
    await assertAllowed(id, "create");
    const M = await loadRulesModel(organizationId);
    const beforeLog = [...M.log];
    const c = upsertCertificate(M, body, actorName(id));
    await deps.certificates.upsert(organizationId, c);
    await persistLogDelta(organizationId, beforeLog, M.log);
    queueTenderLibraryFile({
      organizationId,
      createdBy: subjectId,
      sourceKey: `tender:certificate:${c.id}`,
      name: c.name || "Certificate",
      folderName: "Certificates",
      fileMeta: c.fileMeta,
      fileId: c.fileId,
      fileName: c.fileName,
      reviewDate: c.expires || null,
    });
    return c;
  }

  async function upsertLibraryPolicy(
    identity: MaybeIdentity,
    body: Record<string, unknown>
  ) {
    const { identity: id, organizationId, subjectId } =
      requireOrgIdentity(identity);
    await assertAllowed(id, "create");
    const M = await loadRulesModel(organizationId);
    const beforeLog = [...M.log];
    const p = upsertPolicy(M, body, actorName(id));
    await deps.policies.upsert(organizationId, p);
    await persistLogDelta(organizationId, beforeLog, M.log);
    queueTenderLibraryFile({
      organizationId,
      createdBy: subjectId,
      sourceKey: `tender:policy:${p.id}`,
      name: p.name || "Policy",
      folderName: "Policies",
      fileMeta: p.fileMeta,
      fileId: p.fileId,
      fileName: p.fileName,
      reviewDate: p.nextReview || null,
    });
    return p;
  }

  async function syncDocumentsToLibrary(
    identity: MaybeIdentity
  ): Promise<TenderLibrarySyncResult> {
    const { identity: id, organizationId, subjectId } =
      requireOrgIdentity(identity);
    await assertAllowed(id, "read");
    const result: TenderLibrarySyncResult = {
      scanned: 0,
      created: 0,
      existing: 0,
      failed: 0,
    };
    const tally = (
      status: Awaited<ReturnType<typeof registerTenderLibraryFile>>
    ) => {
      result.scanned += 1;
      if (status === "created") result.created += 1;
      else if (status === "existing") result.existing += 1;
      else if (status === "failed") result.failed += 1;
    };
    const [certs, policies] = await Promise.all([
      deps.certificates.list(organizationId),
      deps.policies.list(organizationId),
    ]);
    for (const c of certs) {
      tally(
        await registerTenderLibraryFile({
          organizationId,
          createdBy: subjectId,
          sourceKey: `tender:certificate:${c.id}`,
          name: c.name || "Certificate",
          folderName: "Certificates",
          fileMeta: c.fileMeta,
          fileId: c.fileId,
          fileName: c.fileName,
          reviewDate: c.expires || null,
        })
      );
    }
    for (const p of policies) {
      tally(
        await registerTenderLibraryFile({
          organizationId,
          createdBy: subjectId,
          sourceKey: `tender:policy:${p.id}`,
          name: p.name || "Policy",
          folderName: "Policies",
          fileMeta: p.fileMeta,
          fileId: p.fileId,
          fileName: p.fileName,
          reviewDate: p.nextReview || null,
        })
      );
    }
    return result;
  }

  async function upsertLibraryService(
    identity: MaybeIdentity,
    body: Record<string, unknown>
  ) {
    const { identity: id, organizationId } = requireOrgIdentity(identity);
    await assertAllowed(id, "create");
    const M = await loadRulesModel(organizationId);
    const beforeLog = [...M.log];
    const s = upsertService(M, body, actorName(id));
    await deps.services.upsert(organizationId, s);
    await persistLogDelta(organizationId, beforeLog, M.log);
    return s;
  }

  async function upsertLibraryCase(
    identity: MaybeIdentity,
    body: Record<string, unknown>
  ) {
    const { identity: id, organizationId } = requireOrgIdentity(identity);
    await assertAllowed(id, "create");
    const M = await loadRulesModel(organizationId);
    const beforeLog = [...M.log];
    const c = upsertCase(M, body, actorName(id));
    await deps.cases.upsert(organizationId, c);
    await persistLogDelta(organizationId, beforeLog, M.log);
    return c;
  }

  async function upsertLibraryRate(
    identity: MaybeIdentity,
    body: Record<string, unknown>
  ) {
    const { identity: id, organizationId } = requireOrgIdentity(identity);
    await assertAllowed(id, "create");
    const M = await loadRulesModel(organizationId);
    const beforeLog = [...M.log];
    const r = upsertRate(M, body, actorName(id));
    await deps.rates.upsert(organizationId, r);
    await persistLogDelta(organizationId, beforeLog, M.log);
    return r;
  }

  async function deleteLibraryItem(
    identity: MaybeIdentity,
    kind: "certificates" | "policies" | "services" | "cases" | "rates",
    itemId: string
  ) {
    const { identity: id, organizationId } = requireOrgIdentity(identity);
    await assertAllowed(id, "delete");
    const M = await loadRulesModel(organizationId);
    const beforeLog = [...M.log];
    removeItem(M, kind, itemId, actorName(id));
    const repo =
      kind === "certificates"
        ? deps.certificates
        : kind === "policies"
          ? deps.policies
          : kind === "services"
            ? deps.services
            : kind === "cases"
              ? deps.cases
              : deps.rates;
    await repo.remove(organizationId, itemId);
    await persistLogDelta(organizationId, beforeLog, M.log);
  }

  async function parseUploadService(
    identity: MaybeIdentity,
    input: { name: string; data: string }
  ) {
    const { identity: id } = requireOrgIdentity(identity);
    await assertAllowed(id, "create");
    const buffer = Buffer.from(input.data.replace(/^data:[^;]+;base64,/, ""), "base64");
    if (!buffer.length) throw new ValidationAppError("Empty file");
    const parsed = parseUpload(input.name, buffer);
    const M = await loadRulesModel(id.organizationId!);

    if (parsed.kind === "xlsx") {
      const scored = parsed.sheets.map((s) => ({
        s,
        p: fromRows(s.rows),
        pr: pricingFromRows(s.rows),
      }));
      const best = [...scored].sort(
        (a, b) => b.p.questions.length - a.p.questions.length
      )[0]!;
      const pricing = scored.find((x) => x.pr);
      return {
        source: "xlsx" as const,
        parsed: best.p,
        sheet: best.s.name,
        doc: analyseDocument(
          input.name,
          "xlsx",
          null,
          (pricing || best).s.rows
        ),
        upload: parsed,
        org: M.org,
      };
    }
    if (parsed.kind === "docx") {
      return {
        source: "docx" as const,
        parsed: fromParagraphs(parsed.paragraphs),
        doc: analyseDocument(input.name, "docx", parsed.paragraphs),
        upload: parsed,
      };
    }
    if (parsed.kind === "csv") {
      return {
        source: "csv" as const,
        parsed: fromRows(parsed.rows),
        doc: analyseDocument(input.name, "csv", null, parsed.rows),
        upload: parsed,
      };
    }
    return {
      source: "portal" as const,
      parsed: fromText(parsed.text),
      doc: analyseDocument(input.name, "portal", parsed.paragraphs),
      upload: parsed,
    };
  }

  async function listQuestionnaires(identity: MaybeIdentity) {
    const { identity: id, organizationId } = requireOrgIdentity(identity);
    await assertAllowed(id, "read");
    return deps.questionnaires.list(organizationId);
  }

  async function getQuestionnaire(identity: MaybeIdentity, qid: string) {
    const { identity: id, organizationId } = requireOrgIdentity(identity);
    await assertAllowed(id, "read");
    return requireQuestionnaire(organizationId, qid);
  }

  async function createQuestionnaire(
    identity: MaybeIdentity,
    body: {
      text?: string;
      parsed?: TenderParsedRows | { questions: unknown[] };
      meta?: NewQuestionnaireMeta;
      draft?: boolean;
    }
  ) {
    const { identity: id, organizationId } = requireOrgIdentity(identity);
    await assertAllowed(id, "create");
    const M = await loadRulesModel(organizationId);
    const beforeLog = [...M.log];
    const parsed: TenderParsedRows | null =
      body.parsed &&
      Array.isArray(body.parsed.questions) &&
      body.parsed.questions.length
        ? (body.parsed as TenderParsedRows)
        : body.text
          ? fromText(body.text)
          : null;
    if (!parsed && !body.meta?.allowEmpty) {
      throw new ValidationAppError("Send parsed questions or text");
    }
    const Q = newQuestionnaire(M, body.meta || {}, parsed, actorName(id));
    if (body.draft !== false && Q.questions.length) {
      await draftQuestionsFor(M, Q.id);
    }
    await persistQuestionnaire(organizationId, Q);
    await persistLogDelta(organizationId, beforeLog, M.log);
    return Q;
  }

  async function updateBidService(
    identity: MaybeIdentity,
    qid: string,
    body: Record<string, unknown>
  ) {
    const { identity: id, organizationId } = requireOrgIdentity(identity);
    await assertAllowed(id, "create");
    const M = await loadRulesModel(organizationId);
    const beforeLog = [...M.log];
    const Q = updateBid(M, qid, body, actorName(id));
    await persistQuestionnaire(organizationId, Q);
    await persistLogDelta(organizationId, beforeLog, M.log);
    return Q;
  }

  async function deleteQuestionnaire(identity: MaybeIdentity, qid: string) {
    const { identity: id, organizationId } = requireOrgIdentity(identity);
    await assertAllowed(id, "delete");
    const M = await loadRulesModel(organizationId);
    const beforeLog = [...M.log];
    const Q = byId(M.questionnaires, qid);
    if (!Q) throw new NotFoundError("Questionnaire not found");
    M.questionnaires = M.questionnaires.filter((q) => q.id !== qid);
    M.log.unshift({
      t: new Date().toISOString(),
      by: actorName(id),
      what: `Removed ${Q.buyer} · ${Q.title}`,
    });
    await deps.questionnaires.remove(organizationId, qid);
    await persistLogDelta(organizationId, beforeLog, M.log);
  }

  async function addPackDocumentService(
    identity: MaybeIdentity,
    qid: string,
    body: {
      name?: string;
      data?: string;
      doc?: Record<string, unknown>;
      draft?: boolean;
      fileId?: string | null;
      fileName?: string | null;
    }
  ) {
    const { identity: id, organizationId } = requireOrgIdentity(identity);
    await assertAllowed(id, "create");
    const M = await loadRulesModel(organizationId);
    const beforeLog = [...M.log];
    let doc = body.doc as Parameters<typeof addPackDocument>[2] | undefined;

    if (!doc && body.name && body.data) {
      const buffer = Buffer.from(
        body.data.replace(/^data:[^;]+;base64,/, ""),
        "base64"
      );
      const uploaded = parseUpload(body.name, buffer);
      if (uploaded.kind === "xlsx") {
        const pr =
          uploaded.sheets.find((s) => pricingFromRows(s.rows)) ||
          uploaded.sheets[0];
        doc = analyseDocument(
          body.name,
          "xlsx",
          null,
          pr?.rows || []
        ) as unknown as Parameters<typeof addPackDocument>[2];
      } else if (uploaded.kind === "docx") {
        doc = analyseDocument(
          body.name,
          "docx",
          uploaded.paragraphs
        ) as unknown as Parameters<typeof addPackDocument>[2];
      } else {
        doc = analyseDocument(
          body.name,
          "portal",
          uploaded.kind === "txt"
            ? uploaded.paragraphs
            : uploaded.text.split(/\r?\n/).map((t) => ({ text: t }))
        ) as unknown as Parameters<typeof addPackDocument>[2];
      }
      if (body.fileId) (doc as { fileId?: string | null }).fileId = body.fileId;
      if (body.fileName)
        (doc as { fileName?: string | null }).fileName = body.fileName;
    }

    if (!doc) throw new ValidationAppError("Send doc or name+data");
    const d = addPackDocument(M, qid, doc, actorName(id));
    if (body.draft !== false) {
      await draftQuestionsFor(M, qid);
    }
    autoAssess(M, qid);
    const Q = byId(M.questionnaires, qid)!;
    await persistQuestionnaire(organizationId, Q);
    await persistLogDelta(organizationId, beforeLog, M.log);
    return d;
  }

  async function assessRequirementService(
    identity: MaybeIdentity,
    qid: string,
    rid: string,
    body: Record<string, unknown>
  ) {
    const { identity: id, organizationId } = requireOrgIdentity(identity);
    await assertAllowed(id, "create");
    const M = await loadRulesModel(organizationId);
    const beforeLog = [...M.log];
    const r = assessRequirement(M, qid, rid, body, actorName(id));
    const Q = byId(M.questionnaires, qid)!;
    await persistQuestionnaire(organizationId, Q);
    await persistLogDelta(organizationId, beforeLog, M.log);
    return r;
  }

  async function autoAssessRequirements(
    identity: MaybeIdentity,
    qid: string
  ) {
    const { identity: id, organizationId } = requireOrgIdentity(identity);
    await assertAllowed(id, "create");
    const M = await loadRulesModel(organizationId);
    const beforeLog = [...M.log];
    const n = autoAssess(M, qid);
    const Q = byId(M.questionnaires, qid);
    if (!Q) throw new NotFoundError("Questionnaire not found");
    await persistQuestionnaire(organizationId, Q);
    await persistLogDelta(organizationId, beforeLog, M.log);
    return { assessed: n };
  }

  async function setPricingService(
    identity: MaybeIdentity,
    qid: string,
    body: Record<string, unknown>
  ) {
    const { identity: id, organizationId } = requireOrgIdentity(identity);
    await assertAllowed(id, "create");
    const M = await loadRulesModel(organizationId);
    const beforeLog = [...M.log];
    const P = setPricing(M, qid, body, actorName(id));
    const Q = byId(M.questionnaires, qid)!;
    await persistQuestionnaire(organizationId, Q);
    await persistLogDelta(organizationId, beforeLog, M.log);
    return P;
  }

  async function getGate(identity: MaybeIdentity, qid: string) {
    const { identity: id, organizationId } = requireOrgIdentity(identity);
    await assertAllowed(id, "read");
    const M = await loadRulesModel(organizationId);
    const Q = byId(M.questionnaires, qid);
    if (!Q) throw new NotFoundError("Questionnaire not found");
    return { ...gate(M, Q), submit: canSubmit(M, Q) };
  }

  function bidFile(
    M: TenderRulesModel,
    Q: TenderQuestionnaire,
    what: string
  ): { kind: string; name: string; mime: string; bytes: Buffer } {
    if (what === "pricing") {
      return {
        kind: "pricing-xlsx",
        name: `${Q.buyer} - Pricing schedule.xlsx`,
        mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        bytes: writeXlsx(pricingRows(Q), "Pricing"),
      };
    }
    if (what === "questionnaire") {
      return {
        kind: "xlsx",
        name: `${Q.buyer} - Questionnaire.xlsx`,
        mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        bytes: writeXlsx(exportRows(Q), "Responses"),
      };
    }
    return {
      kind: "bid-docx",
      name: `${Q.buyer} - Tender response.docx`,
      mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      bytes: writeDocx(bidBlocks(M, Q) as DocxBlock[]),
    };
  }

  async function getBid(
    identity: MaybeIdentity,
    qid: string,
    what = "bid"
  ) {
    const { identity: id, organizationId } = requireOrgIdentity(identity);
    await assertAllowed(id, "read");
    const M = await loadRulesModel(organizationId);
    const beforeLog = [...M.log];
    const Q = byId(M.questionnaires, qid);
    if (!Q) throw new NotFoundError("Questionnaire not found");
    const f = bidFile(M, Q, what);
    recordExport(M, Q.id, f.kind, actorName(id));
    await persistQuestionnaire(organizationId, Q);
    await persistLogDelta(organizationId, beforeLog, M.log);
    return f;
  }

  async function exportQuestionnaire(
    identity: MaybeIdentity,
    qid: string,
    format = "xlsx"
  ) {
    const { identity: id, organizationId } = requireOrgIdentity(identity);
    await assertAllowed(id, "read");
    const M = await loadRulesModel(organizationId);
    const beforeLog = [...M.log];
    const Q = byId(M.questionnaires, qid);
    if (!Q) throw new NotFoundError("Questionnaire not found");
    let bytes: Buffer;
    let mime: string;
    let ext: string;
    if (format === "docx") {
      bytes = writeDocx(exportBlocks(M, Q) as DocxBlock[]);
      mime =
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      ext = "docx";
    } else if (format === "csv") {
      bytes = writeCsv(exportRows(Q));
      mime = "text/csv";
      ext = "csv";
    } else {
      bytes = writeXlsx(exportRows(Q), "Responses");
      mime =
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      ext = "xlsx";
    }
    recordExport(M, Q.id, ext, actorName(id));
    await persistQuestionnaire(organizationId, Q);
    await persistLogDelta(organizationId, beforeLog, M.log);
    const name = `${Q.buyer} - ${Q.title}.${ext}`.replace(/[\\/:*?"<>|]/g, "-");
    return { bytes, mime, name };
  }

  async function draftQuestionnaire(
    identity: MaybeIdentity,
    qid: string,
    only?: string[] | null
  ) {
    const { identity: id, organizationId } = requireOrgIdentity(identity);
    await assertAllowed(id, "create");
    const M = await loadRulesModel(organizationId);
    const beforeLog = [...M.log];
    const drafted = await draftQuestionsFor(M, qid, only);
    const Q = byId(M.questionnaires, qid);
    if (!Q) throw new NotFoundError("Questionnaire not found");
    await persistQuestionnaire(organizationId, Q);
    await persistLogDelta(organizationId, beforeLog, M.log);
    return { drafted };
  }

  async function setAnswerService(
    identity: MaybeIdentity,
    qid: string,
    questionId: string,
    body: Record<string, unknown>
  ) {
    const { identity: id, organizationId } = requireOrgIdentity(identity);
    await assertAllowed(id, "create");
    const M = await loadRulesModel(organizationId);
    const beforeLog = [...M.log];
    const q = setAnswer(M, qid, questionId, body, actorName(id));
    const Q = byId(M.questionnaires, qid)!;
    await persistQuestionnaire(organizationId, Q);
    await persistLogDelta(organizationId, beforeLog, M.log);
    return q;
  }

  async function acceptAnswer(
    identity: MaybeIdentity,
    qid: string,
    questionId: string
  ) {
    const { identity: id, organizationId } = requireOrgIdentity(identity);
    await assertAllowed(id, "create");
    const M = await loadRulesModel(organizationId);
    const beforeLog = [...M.log];
    const q = accept(M, qid, questionId, actorName(id));
    const Q = byId(M.questionnaires, qid)!;
    await persistQuestionnaire(organizationId, Q);
    await persistLogDelta(organizationId, beforeLog, M.log);
    return q;
  }

  async function approveAnswers(
    identity: MaybeIdentity,
    qid: string,
    questionIds?: string[] | null
  ) {
    const { identity: id, organizationId } = requireOrgIdentity(identity);
    const M = await loadRulesModel(organizationId);
    await assertApproverOrCreate(assertAllowed, id, M.settings);
    const beforeLog = [...M.log];
    const role = isApprover(M.settings, id) ? "approver" : "contributor";
    const r = approve(
      M,
      qid,
      questionIds,
      actorName(id),
      null,
      role
    );
    const Q = byId(M.questionnaires, qid)!;
    await persistQuestionnaire(organizationId, Q);
    await persistLibraryAnswers(organizationId, M.library.answers);
    await persistLogDelta(organizationId, beforeLog, M.log);
    return r;
  }

  async function submitEmail(
    identity: MaybeIdentity,
    qid: string,
    body: { force?: boolean; cc?: string }
  ) {
    const { identity: id, organizationId } = requireOrgIdentity(identity);
    const M = await loadRulesModel(organizationId);
    await assertApproverOrCreate(assertAllowed, id, M.settings);
    const beforeLog = [...M.log];
    const Q = byId(M.questionnaires, qid);
    if (!Q) throw new NotFoundError("Questionnaire not found");
    const c = canSubmit(M, Q);
    if (!c.ok && !body.force) {
      throw new ValidationAppError(c.errs.join(" · "));
    }
    if (!Q.submissionEmail) {
      throw new ValidationAppError("No submission email on the tender");
    }
    const pk = submissionPackage(M, Q);
    const atts: Array<{ name: string; bytes: Buffer; mime: string }> = [
      bidFile(M, Q, "bid"),
      bidFile(M, Q, "pricing"),
      bidFile(M, Q, "questionnaire"),
    ];

    for (const cert of M.library.certificates || []) {
      let meta = cert.fileMeta ?? null;
      if (!meta && cert.fileId) {
        try {
          const parsed = JSON.parse(cert.fileId) as TenderFileMeta;
          if (parsed?.Bucket) meta = parsed;
        } catch {
          /* fileId is not JSON meta */
        }
      }
      if (!meta || !deps.files.downloadBytes) continue;
      try {
        const bytes = await deps.files.downloadBytes(meta);
        atts.push({
          name: cert.fileName || meta.Name || `${cert.name}.pdf`,
          bytes,
          mime: "application/pdf",
        });
      } catch {
        /* skip unreachable cert files */
      }
    }

    const mail = buildTenderSubmissionEmail({
      orgName: M.org,
      buyer: Q.buyer,
      title: Q.title,
      reference: Q.reference,
      body: pk.body,
      actorName: actorName(id),
      attachmentNames: atts.map((a) => a.name),
    });

    const ccRaw = body.cc || M.settings.submissionCc || "";
    const cc = ccRaw
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean);

    const submissionId = `sub-${Date.now().toString(36)}`;
    await deps.email.send({
      to: [pk.to],
      cc,
      subject: mail.subject || pk.subject,
      html: mail.html,
      text: mail.text || pk.body,
      organizationId,
      attachments: atts.map((a) => ({
        filename: a.name,
        content: a.bytes,
        contentType: a.mime,
      })),
    });

    markSubmitted(M, Q.id, actorName(id), null, "email");
    Q.submission = {
      t: new Date().toISOString(),
      to: pk.to,
      by: actorName(id),
      attachments: atts.map((a) => a.name),
      mode: "email",
      id: submissionId,
    };
    await persistQuestionnaire(organizationId, Q);
    await persistLogDelta(organizationId, beforeLog, M.log);
    return {
      ...pk,
      attachments: atts.map((a) => a.name),
      mode: "email",
      id: submissionId,
    };
  }

  async function markSubmittedService(
    identity: MaybeIdentity,
    qid: string,
    how = "manual"
  ) {
    const { identity: id, organizationId } = requireOrgIdentity(identity);
    await assertAllowed(id, "create");
    const M = await loadRulesModel(organizationId);
    const beforeLog = [...M.log];
    const Q = markSubmitted(M, qid, actorName(id), null, how);
    await persistQuestionnaire(organizationId, Q);
    await persistLogDelta(organizationId, beforeLog, M.log);
    return Q;
  }

  async function standaloneDraft(
    identity: MaybeIdentity,
    input: { question: string; wordLimit?: number | null }
  ) {
    const { identity: id, organizationId } = requireOrgIdentity(identity);
    await assertAllowed(id, "create");
    const M = await loadRulesModel(organizationId);
    const q: TenderQuestion = {
      id: "standalone",
      ref: "",
      section: "",
      text: input.question,
      type: "text",
      wordLimit: input.wordLimit ?? null,
      answer: "",
      status: "blank",
      confidence: 0,
      sources: [],
      hist: [],
    };
    const base = draft(M, q, buildIndex(M));
    const d = await enhanceDraftWithAlice(M, q, base);
    const autofill =
      d.confidence >= (M.settings.minConfidence ?? 0.55) &&
      d.sources.some((s) => {
        if (s.kind !== "answer") return false;
        const a = byId(M.library.answers, s.id);
        return !!(a && a.approvedAt && !isStale(M, a));
      });
    return { ...d, autofill };
  }

  async function createFileUpload(
    identity: MaybeIdentity,
    input: { fileName: string; contentType?: string; fileSize?: number }
  ) {
    const { identity: id, organizationId } = requireOrgIdentity(identity);
    await assertAllowed(id, "create");
    return deps.files.createSignedUpload({
      organizationId,
      fileName: input.fileName,
      contentType: input.contentType,
      fileSize: input.fileSize,
    });
  }

  async function auditorPack(
    identity: MaybeIdentity,
    format: "html" | "pdf" = "html"
  ): Promise<{ contentType: string; filename: string; body: Buffer | string }> {
    const { identity: id, organizationId } = requireOrgIdentity(identity);
    await assertAllowed(id, "read");
    const M = await loadRulesModel(organizationId);
    if (format === "pdf") {
      const body = await buildAuditorPackPdf({
        orgName: M.org,
        model: M,
      });
      return {
        contentType: "application/pdf",
        filename: "tender-auditor-pack.pdf",
        body,
      };
    }
    const html = buildAuditorPackHtml({ orgName: M.org, model: M });
    return {
      contentType: "text/html; charset=utf-8",
      filename: "tender-auditor-pack.html",
      body: html,
    };
  }

  return {
    assertAllowed,
    getSettings,
    updateSettings: updateSettingsService,
    updateFacts: updateFactsService,
    libraryHealth: getLibraryHealth,
    overview,
    getLog,
    listLibrary,
    upsertLibraryAnswer,
    deleteLibraryAnswer,
    upsertLibraryCertificate,
    upsertLibraryPolicy,
    upsertLibraryService,
    upsertLibraryCase,
    upsertLibraryRate,
    syncDocumentsToLibrary,
    deleteLibraryItem,
    parseUpload: parseUploadService,
    listQuestionnaires,
    getQuestionnaire,
    createQuestionnaire,
    updateBid: updateBidService,
    deleteQuestionnaire,
    addPackDocument: addPackDocumentService,
    assessRequirement: assessRequirementService,
    autoAssessRequirements,
    setPricing: setPricingService,
    getGate,
    getBid,
    exportQuestionnaire,
    draftQuestionnaire,
    setAnswer: setAnswerService,
    acceptAnswer,
    approveAnswers,
    submitEmail,
    markSubmitted: markSubmittedService,
    standaloneDraft,
    createFileUpload,
    auditorPack,
  };
}

export type { TenderFileMeta };
