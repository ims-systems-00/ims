/**
 * Supplier ASL application service — production rules + integrations.
 */
import { randomUUID } from "node:crypto";
import {
  DEFAULT_IMS_EMAIL_BRANDING,
  type EmailBranding,
} from "../../../infrastructure/email/templates";
import type { Authorizer, SecurityIdentity } from "../../../security";
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationAppError,
} from "../../../shared";
import {
  storageInfoFromMeta,
  type DocumentModuleLibraryPort,
} from "../../document-management";
import { createOrganisationEmailBrandingResolver } from "../../organisation/adapters/email-branding.adapter";
import {
  appendTrail,
  applyEvaluationOutcome,
  applyStandingRules,
  collectIssues,
  daysUntil,
  expiredDocs,
  isDocRequiredForSupplier,
  missingDocs,
  soonDocs,
  startOfToday,
  toIsoDate,
  validateCriteriaWeights,
  weightedScore,
} from "../lib/asl-rules";
import {
  buildAuditorPackHtml,
  buildAuditorPackPdf,
  buildCsvExport,
} from "../lib/auditor-pack";
import {
  buildEvalDueInternalMail,
  buildEvalDueMail,
  buildSupplierMail,
  recentChaseType,
} from "../lib/mail";
import {
  signShareToken,
  signUploadToken,
  verifyShareToken,
  verifyUploadToken,
} from "../lib/tokens";
import type {
  AslEmailPort,
  AslFilesPort,
  AslIncidentPort,
  AslNotificationPort,
  AslOrgPort,
  AslTaskPort,
  AslUsersPort,
} from "../ports";
import type { AslSettingsRepository } from "../repositories/asl-settings.repository";
import {
  newEmbeddedId,
  type AslSupplierRepository,
} from "../repositories/asl-supplier.repository";
import {
  ASL_SUPPLIERS_RESOURCE,
  type AslDocument,
  type AslEvaluation,
  type AslNotifyResult,
  type AslOverview,
  type AslPublicSnapshot,
  type AslShareResult,
  type AslSupplier,
  type CreateAslEvaluationInput,
  type CreateAslSupplierInput,
  type ListAslSuppliersQuery,
  type PaginatedAslSuppliers,
  type PublicAslUploadInput,
  type UpdateAslSettingsInput,
  type UpdateAslSupplierInput,
  type UpsertAslDocumentInput,
} from "../types";

function requireOrgIdentity(identity: SecurityIdentity | null | undefined): {
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

function nextReference(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ASL-${stamp}-${rand}`;
}

function actorName(identity: SecurityIdentity): string {
  return identity.email?.trim() || identity.subjectId || "System";
}

export type AslSupplierServiceDeps = {
  suppliers: AslSupplierRepository;
  settings: AslSettingsRepository;
  authorizer: Authorizer;
  email: AslEmailPort;
  files: AslFilesPort;
  tasks: AslTaskPort;
  incidents: AslIncidentPort;
  org: AslOrgPort;
  users: AslUsersPort;
  notifications: AslNotificationPort;
  documents: DocumentModuleLibraryPort;
  tokenSecret: string;
  publicApiBaseUrl: string;
  clientUrl: string;
};

export type AslSupplierService = ReturnType<typeof createAslSupplierService>;

export type AslLibrarySyncResult = {
  scanned: number;
  created: number;
  existing: number;
  failed: number;
};

export function createAslSupplierService(deps: AslSupplierServiceDeps) {
  const resolveEmailBranding = createOrganisationEmailBrandingResolver();

  async function registerSupplierDoc(input: {
    organizationId: string;
    createdBy: string;
    supplierId: string;
    supplierName: string;
    doc: AslDocument;
  }): Promise<"created" | "existing" | "skipped" | "failed"> {
    const storageInfo = storageInfoFromMeta(input.doc.file);
    if (!storageInfo) return "skipped";
    try {
      const result = await deps.documents.registerDocument({
        organizationId: input.organizationId,
        createdBy: input.createdBy,
        sourceModule: "supplier",
        sourceKey: `supplier:doc:${input.supplierId}:${input.doc.id}`,
        name: `${input.supplierName} — ${input.doc.type}`,
        storageInfo,
        purpose: "Document",
        reviewDate: input.doc.exp || null,
        sourceLabel: input.supplierName,
        folderName: input.doc.type || "Documents",
      });
      if (!result) return "skipped";
      return result.created ? "created" : "existing";
    } catch {
      // Non-fatal — ASL write already succeeded.
      return "failed";
    }
  }

  function queueSupplierDoc(
    input: Parameters<typeof registerSupplierDoc>[0]
  ): void {
    void registerSupplierDoc(input);
  }

  async function brandingFor(organizationId: string): Promise<EmailBranding> {
    try {
      return await resolveEmailBranding(organizationId);
    } catch {
      return DEFAULT_IMS_EMAIL_BRANDING;
    }
  }

  async function assertAllowed(
    identity: SecurityIdentity,
    action: "read" | "create" | "delete",
    resourceId?: string
  ): Promise<void> {
    const allowed = await deps.authorizer.allow({
      identity,
      action,
      resourceType: ASL_SUPPLIERS_RESOURCE,
      resourceId,
      organizationId: identity.organizationId,
    });
    if (!allowed) {
      throw new ForbiddenError(
        "User does not have permission to access suppliers"
      );
    }
  }

  async function requireSupplier(
    organizationId: string,
    id: string
  ): Promise<AslSupplier> {
    const row = await deps.suppliers.findById(organizationId, id);
    if (!row) throw new NotFoundError("Supplier not found");
    return row;
  }

  async function persistRules(
    organizationId: string,
    supplier: AslSupplier,
    actorId: string
  ): Promise<AslSupplier> {
    const settings = await deps.settings.getOrCreate(organizationId);
    const applied = applyStandingRules(supplier, settings, "System");
    const saved = await deps.suppliers.replace(
      organizationId,
      applied.supplier.id,
      applied.supplier,
      actorId
    );
    if (!saved) throw new NotFoundError("Supplier not found");
    return saved;
  }

  function buildOverview(
    suppliers: AslSupplier[],
    settings: Awaited<ReturnType<AslSettingsRepository["getOrCreate"]>>,
    today = startOfToday()
  ): AslOverview {
    const live = suppliers.filter((s) => s.status !== "Removed");
    const attention: AslOverview["attention"] = [];
    for (const s of live) {
      for (const issue of collectIssues(s, settings, today)) {
        attention.push({
          supplierId: s.id,
          name: s.name,
          crit: s.crit,
          cat: s.cat,
          status: s.status,
          issue,
        });
      }
    }
    const order: Record<string, number> = {
      expired: 0,
      missing: 1,
      eval: 2,
      score: 3,
      reqs: 4,
      soon: 5,
      evalsoon: 6,
    };
    attention.sort(
      (a, b) => (order[a.issue.k] ?? 9) - (order[b.issue.k] ?? 9)
    );

    const critical = live.filter((s) => s.crit === "Critical");
    const expiringCount = live.reduce(
      (n, s) =>
        n +
        soonDocs(s, settings.lead, today).length +
        expiredDocs(s, settings.lead, today).length,
      0
    );
    const evalDue = live.filter((s) =>
      collectIssues(s, settings, today).some(
        (i) => i.k === "eval" || i.k === "evalsoon"
      )
    );
    const chasedThisMonth = suppliers.reduce(
      (n, s) =>
        n +
        s.comms.filter((c) => daysUntil(c.date, today) > -31).length,
      0
    );

    const readiness: AslOverview["readiness"] = [
      {
        label:
          "Criteria for selection, evaluation and re-evaluation are documented",
        pass: settings.criteria.length >= 3,
        detail: "Criteria & settings",
        clause: "8.4.1",
      },
      {
        label: "Every approved supplier has an approval record (who, when)",
        pass: live
          .filter((s) => s.status === "Approved")
          .every((s) => Boolean(s.appby && s.appon)),
        detail: "Approval recorded on each supplier",
        clause: "8.4.1",
      },
      {
        label: "Every critical supplier evaluated within interval",
        pass: critical.every((s) => {
          const issues = collectIssues(s, settings, today);
          return !issues.some((i) => i.k === "eval");
        }),
        detail: `${critical.filter((s) => collectIssues(s, settings, today).some((i) => i.k === "eval")).length} critical supplier(s) overdue`,
        clause: "8.4.1",
      },
      {
        label:
          "No approved supplier with an expired or missing mandatory document",
        pass: live
          .filter((s) => s.status === "Approved")
          .every(
            (s) =>
              expiredDocs(s, settings.lead, today).filter((d) => d.req)
                .length === 0 &&
              missingDocs(s, settings.lead, today).length === 0
          ),
        detail: "Rule moves them to Conditional automatically",
        clause: "8.4.2",
      },
      {
        label:
          "Controls proportionate to risk (criticality set on every supplier)",
        pass: live.every((s) => Boolean(s.crit)),
        detail: "Criticality drives required documents and interval",
        clause: "8.4.2",
      },
      {
        label: "Requirements communicated to each supplier are recorded",
        pass: live
          .filter((s) => s.status !== "Prospective")
          .every((s) => Boolean(s.reqs)),
        detail: `${live.filter((s) => s.status !== "Prospective" && !s.reqs).length} supplier(s) without recorded requirements`,
        clause: "8.4.3",
      },
      {
        label: "Contractors on site: RAMS and SSIP/competence on file",
        pass: live
          .filter((s) => s.cat === "Contractor on site")
          .every((s) => missingDocs(s, settings.lead, today).length === 0),
        detail: "ISO 45001 8.1.4.2",
        clause: "45001",
      },
      {
        label: "Data processors: DPA and security assurance on file",
        pass: live
          .filter((s) => s.cat === "IT / data processor")
          .every((s) => missingDocs(s, settings.lead, today).length === 0),
        detail: "ISO 27001 A.5.19–5.22",
        clause: "27001",
      },
      {
        label: "Expiries chased and chases logged",
        pass: live
          .filter(
            (s) =>
              soonDocs(s, settings.lead, today).length +
                expiredDocs(s, settings.lead, today).length >
              0
          )
          .every((s) =>
            s.comms.some((c) => /chase|request|notif|follow|escal/i.test(c.type))
          ),
        detail: "Communications log",
        clause: "Records",
      },
    ];

    return {
      asOf: toIsoDate(today),
      totals: {
        live: live.length,
        critical: critical.length,
        approved: live.filter((s) => s.status === "Approved").length,
        conditional: live.filter((s) => s.status === "Conditional").length,
        docsExpiring: expiringCount,
        evaluationsDue: evalDue.length,
        chasedThisMonth,
      },
      attention: attention.slice(0, 50),
      readiness,
    };
  }

  function uploadPublicUrl(token: string): string {
    const base = deps.clientUrl.replace(/\/+$/, "");
    return `${base}/supplier/upload/${encodeURIComponent(token)}`;
  }

  function sharePublicUrl(token: string): string {
    const base = deps.clientUrl.replace(/\/+$/, "");
    return `${base}/supplier/public/${encodeURIComponent(token)}`;
  }

  return {
    async getSettings(identity: SecurityIdentity | null | undefined) {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      return deps.settings.getOrCreate(organizationId);
    },

    async updateSettings(
      identity: SecurityIdentity | null | undefined,
      input: UpdateAslSettingsInput
    ) {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "create");
      if (input.criteria) {
        const err = validateCriteriaWeights(input.criteria);
        if (err) throw new ValidationAppError(err);
      }
      return deps.settings.update(organizationId, input, subjectId);
    },

    async overview(identity: SecurityIdentity | null | undefined) {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      const [settings, suppliers] = await Promise.all([
        deps.settings.getOrCreate(organizationId),
        deps.suppliers.listAllInOrg(organizationId),
      ]);
      return buildOverview(suppliers, settings);
    },

    async list(
      identity: SecurityIdentity | null | undefined,
      query: ListAslSuppliersQuery
    ): Promise<PaginatedAslSuppliers> {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      const settings = await deps.settings.getOrCreate(organizationId);

      if (query.issue) {
        const all = await deps.suppliers.listAllInOrg(organizationId);
        let filtered = all.filter((s) =>
          query.includeRemoved ? true : s.status !== "Removed"
        );
        if (query.crit) filtered = filtered.filter((s) => s.crit === query.crit);
        if (query.status)
          filtered = filtered.filter((s) => s.status === query.status);
        if (query.search?.trim()) {
          const q = query.search.trim().toLowerCase();
          filtered = filtered.filter((s) =>
            `${s.name}${s.cat}${s.contact}`.toLowerCase().includes(q)
          );
        }
        filtered = filtered.filter(
          (s) => collectIssues(s, settings).length > 0
        );
        const page = query.page ?? 1;
        const pageSize = Math.min(query.pageSize ?? 25, 100);
        const total = filtered.length;
        const items = filtered.slice((page - 1) * pageSize, page * pageSize);
        return {
          items,
          page,
          pageSize,
          total,
          totalPages: Math.max(1, Math.ceil(total / pageSize)),
        };
      }

      return deps.suppliers.list(organizationId, query);
    },

    async getById(identity: SecurityIdentity | null | undefined, id: string) {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      const supplier = await requireSupplier(organizationId, id);
      return persistRules(organizationId, supplier, subjectId);
    },

    async create(
      identity: SecurityIdentity | null | undefined,
      input: CreateAslSupplierInput
    ) {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "create");
      const name = input.name.trim();
      if (!name) throw new ValidationAppError("Name is required");
      const who = actorName(actor);
      return deps.suppliers.create(organizationId, {
        ...input,
        name,
        email: input.email?.trim() || "",
        reference: nextReference(),
        createdBy: subjectId,
        trail: [
          {
            t: new Date().toISOString().slice(0, 16),
            by: who,
            what: "Created as prospective supplier",
          },
        ],
      });
    },

    async update(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: UpdateAslSupplierInput
    ) {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "create");
      let supplier = await requireSupplier(organizationId, id);
      const who = actorName(actor);
      const changed: string[] = [];
      const set = <K extends keyof AslSupplier>(key: K, value: AslSupplier[K]) => {
        if (supplier[key] !== value) {
          changed.push(String(key));
          supplier = { ...supplier, [key]: value };
        }
      };

      if (input.name !== undefined) set("name", input.name.trim());
      if (input.cat !== undefined) set("cat", input.cat);
      if (input.crit !== undefined) set("crit", input.crit);
      if (input.contact !== undefined) set("contact", input.contact.trim());
      if (input.email !== undefined) set("email", input.email.trim());
      if (input.scope !== undefined) set("scope", input.scope.trim());
      if (input.reqs !== undefined) set("reqs", input.reqs.trim());
      if (input.appby !== undefined) set("appby", input.appby.trim());
      if (input.appon !== undefined) set("appon", input.appon);
      if (input.stds !== undefined) set("stds", input.stds);
      if (input.evalDue !== undefined) {
        const nextDue = input.evalDue?.trim() || null;
        if (supplier.evalDue !== nextDue) {
          changed.push("evalDue");
          supplier = {
            ...supplier,
            evalDue: nextDue,
            evalDueNotifiedOn: null,
          };
        }
      }
      if (input.status !== undefined && input.status !== supplier.status) {
        changed.push("status");
        supplier = { ...supplier, status: input.status };
        if (input.status === "Approved" && !supplier.appon) {
          supplier = {
            ...supplier,
            appon: toIsoDate(startOfToday()),
            appby: supplier.appby || who,
          };
        }
      }

      if (changed.length) {
        supplier = {
          ...supplier,
          trail: appendTrail(supplier.trail, `Updated: ${changed.join(", ")}`, who),
        };
        if (changed.includes("reqs")) {
          supplier = {
            ...supplier,
            comms: [
              {
                id: newEmbeddedId(),
                date: toIsoDate(startOfToday()),
                type: "Requirements",
                subject: "Requirements recorded/communicated",
                by: who,
                outcome: "Recorded",
              },
              ...supplier.comms,
            ],
          };
        }
      }

      const saved = await deps.suppliers.replace(
        organizationId,
        id,
        supplier,
        subjectId
      );
      if (!saved) throw new NotFoundError("Supplier not found");
      return persistRules(organizationId, saved, subjectId);
    },

    async addDocument(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: UpsertAslDocumentInput
    ) {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "create");
      let supplier = await requireSupplier(organizationId, id);
      const who = actorName(actor);
      const type = input.type.trim();
      const exp = input.exp ?? null;
      const ref = input.ref?.trim() ?? "";
      const req =
        input.req ?? isDocRequiredForSupplier(supplier, type);
      const existing = supplier.docs.find((d) => d.type === type);
      if (existing) {
        const docs = supplier.docs.map((d) =>
          d.id === existing.id
            ? {
                ...d,
                exp,
                ref: ref || d.ref,
                req,
                file: input.storageInfo ?? d.file,
              }
            : d
        );
        supplier = {
          ...supplier,
          docs,
          trail: appendTrail(
            supplier.trail,
            `${type} replaced · expires ${exp ?? "n/a"}`,
            who
          ),
        };
      } else {
        const doc: AslDocument = {
          id: newEmbeddedId(),
          type,
          exp,
          ref,
          req,
          chased: null,
          file: input.storageInfo ?? null,
        };
        supplier = {
          ...supplier,
          docs: [...supplier.docs, doc],
          trail: appendTrail(
            supplier.trail,
            `${type} added · expires ${exp ?? "n/a"}`,
            who
          ),
        };
      }
      const saved = await deps.suppliers.replace(
        organizationId,
        id,
        supplier,
        subjectId
      );
      if (!saved) throw new NotFoundError("Supplier not found");
      const registered = saved.docs.find((d) => d.type === type);
      if (registered?.file) {
        queueSupplierDoc({
          organizationId,
          createdBy: subjectId,
          supplierId: saved.id,
          supplierName: saved.name,
          doc: registered,
        });
      }
      return persistRules(organizationId, saved, subjectId);
    },

    async updateDocument(
      identity: SecurityIdentity | null | undefined,
      id: string,
      docId: string,
      input: UpsertAslDocumentInput
    ) {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "create");
      let supplier = await requireSupplier(organizationId, id);
      const who = actorName(actor);
      const idx = supplier.docs.findIndex((d) => d.id === docId);
      if (idx < 0) throw new NotFoundError("Document not found");
      const current = supplier.docs[idx]!;
      const next: AslDocument = {
        ...current,
        type: input.type?.trim() || current.type,
        exp: input.exp !== undefined ? input.exp : current.exp,
        ref: input.ref !== undefined ? input.ref.trim() : current.ref,
        req:
          input.req !== undefined
            ? input.req
            : isDocRequiredForSupplier(supplier, input.type || current.type),
        file:
          input.storageInfo !== undefined
            ? input.storageInfo
            : current.file,
      };
      const docs = [...supplier.docs];
      docs[idx] = next;
      supplier = {
        ...supplier,
        docs,
        trail: appendTrail(
          supplier.trail,
          `${next.type} updated · expires ${next.exp ?? "n/a"}`,
          who
        ),
      };
      const saved = await deps.suppliers.replace(
        organizationId,
        id,
        supplier,
        subjectId
      );
      if (!saved) throw new NotFoundError("Supplier not found");
      if (next.file) {
        queueSupplierDoc({
          organizationId,
          createdBy: subjectId,
          supplierId: saved.id,
          supplierName: saved.name,
          doc: next,
        });
      }
      return persistRules(organizationId, saved, subjectId);
    },

    async deleteDocument(
      identity: SecurityIdentity | null | undefined,
      id: string,
      docId: string
    ) {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "delete");
      let supplier = await requireSupplier(organizationId, id);
      const who = actorName(actor);
      const doc = supplier.docs.find((d) => d.id === docId);
      if (!doc) throw new NotFoundError("Document not found");
      supplier = {
        ...supplier,
        docs: supplier.docs.filter((d) => d.id !== docId),
        trail: appendTrail(
          supplier.trail,
          `${doc.type} removed from record`,
          who
        ),
      };
      const saved = await deps.suppliers.replace(
        organizationId,
        id,
        supplier,
        subjectId
      );
      if (!saved) throw new NotFoundError("Supplier not found");
      return persistRules(organizationId, saved, subjectId);
    },

    async addEvaluation(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: CreateAslEvaluationInput
    ) {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "create");
      const settings = await deps.settings.getOrCreate(organizationId);
      let supplier = await requireSupplier(organizationId, id);
      const who = actorName(actor);

      for (const c of settings.criteria) {
        const v = input.scores[c.k];
        if (typeof v !== "number" || v < 1 || v > 5) {
          throw new ValidationAppError(`Score every criterion (${c.n})`);
        }
      }
      const score = weightedScore(input.scores, settings.criteria);
      if (score === null) {
        throw new ValidationAppError("Unable to compute evaluation score");
      }

      const evaluation: AslEvaluation = {
        id: newEmbeddedId(),
        date: toIsoDate(startOfToday()),
        by: who,
        scores: input.scores,
        note: input.note?.trim() ?? "",
        score,
      };

      supplier = {
        ...supplier,
        evals: [...supplier.evals, evaluation],
        evalDue: null,
        evalDueNotifiedOn: null,
        trail: appendTrail(
          supplier.trail,
          `Evaluation recorded · score ${score}`,
          who
        ),
      };
      supplier = applyEvaluationOutcome(supplier, evaluation, who);
      const saved = await deps.suppliers.replace(
        organizationId,
        id,
        supplier,
        subjectId
      );
      if (!saved) throw new NotFoundError("Supplier not found");

      if (score < 3) {
        await deps.incidents.createLowScoreIncident({
          organizationId,
          supplierId: saved.id,
          supplierName: saved.name,
          score,
          note: evaluation.note,
          createdBy: subjectId,
        });
      }

      return persistRules(organizationId, saved, subjectId);
    },

    async notify(
      identity: SecurityIdentity | null | undefined,
      ids: string[]
    ): Promise<AslNotifyResult[]> {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "create");
      const settings = await deps.settings.getOrCreate(organizationId);
      const orgName = await deps.org.getOrganizationName(organizationId);
      const branding = await brandingFor(organizationId);
      const who = actorName(actor);
      const today = startOfToday();
      const results: AslNotifyResult[] = [];

      for (const id of ids) {
        let supplier = await deps.suppliers.findById(organizationId, id);
        if (!supplier || supplier.status === "Removed") {
          results.push({
            supplierId: id,
            name: "",
            email: null,
            sent: false,
            type: "Notification",
            subject: "",
            error: "Supplier not found",
          });
          continue;
        }

        const uploadToken = await signUploadToken(deps.tokenSecret, {
          organizationId,
          supplierId: supplier.id,
        });
        const mail = buildSupplierMail({
          supplier,
          settings,
          orgName,
          actorName: who,
          uploadUrl: uploadPublicUrl(uploadToken),
          today,
          branding,
        });
        const type = recentChaseType(supplier, settings.esc, today);
        let sent = false;
        let error: string | undefined;
        if (supplier.email.trim()) {
          try {
            await deps.email.send({
              to: [supplier.email.trim()],
              subject: mail.subject,
              html: mail.html,
              text: mail.text,
              organizationId,
              from: settings.from,
            });
            sent = true;
          } catch (err) {
            error = err instanceof Error ? err.message : "Send failed";
          }
        } else {
          error = "No email on record";
        }

        const outcome = sent
          ? `Sent · follow-up ${toIsoDate(new Date(today.getTime() + settings.follow * 86400000))} · escalate ${toIsoDate(new Date(today.getTime() + settings.esc * 86400000))}`
          : error || "Not sent";

        const chased = toIsoDate(today);
        const docs = supplier.docs.map((d) => {
          const stateSoonOrExpired =
            soonDocs(supplier!, settings.lead, today).some((x) => x.id === d.id) ||
            expiredDocs(supplier!, settings.lead, today).some((x) => x.id === d.id);
          return stateSoonOrExpired ? { ...d, chased } : d;
        });

        supplier = {
          ...supplier,
          docs,
          comms: [
            {
              id: newEmbeddedId(),
              date: chased,
              type,
              subject: mail.subject,
              by: who,
              outcome,
            },
            ...supplier.comms,
          ],
          trail: appendTrail(
            supplier.trail,
            `${type} sent: ${mail.items.length} item(s)`,
            who
          ),
        };
        await deps.suppliers.replace(
          organizationId,
          supplier.id,
          supplier,
          subjectId
        );

        results.push({
          supplierId: supplier.id,
          name: supplier.name,
          email: supplier.email || null,
          sent,
          type,
          subject: mail.subject,
          error,
        });
      }

      return results;
    },

    async auditorPack(
      identity: SecurityIdentity | null | undefined,
      format: "html" | "pdf"
    ): Promise<{ contentType: string; body: Buffer | string; filename: string }> {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      const settings = await deps.settings.getOrCreate(organizationId);
      const suppliers = await deps.suppliers.listAllInOrg(organizationId);
      const orgName = await deps.org.getOrganizationName(organizationId);
      const overview = buildOverview(suppliers, settings);
      const asOf = toIsoDate(startOfToday());
      if (format === "pdf") {
        const body = await buildAuditorPackPdf({
          orgName,
          suppliers,
          settings,
          overview,
          asOf,
        });
        return {
          contentType: "application/pdf",
          body,
          filename: `asl-auditor-pack-${asOf}.pdf`,
        };
      }
      const html = buildAuditorPackHtml({
        orgName,
        suppliers,
        settings,
        overview,
        asOf,
      });
      return {
        contentType: "text/html; charset=utf-8",
        body: html,
        filename: `asl-auditor-pack-${asOf}.html`,
      };
    },

    async exportCsv(identity: SecurityIdentity | null | undefined) {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      const settings = await deps.settings.getOrCreate(organizationId);
      const suppliers = await deps.suppliers.listAllInOrg(organizationId);
      return buildCsvExport(suppliers, settings);
    },

    async share(
      identity: SecurityIdentity | null | undefined,
      expiresInDays: number
    ): Promise<AslShareResult> {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "create");
      const days = Math.min(Math.max(expiresInDays || 30, 1), 90);
      const expiresAt = new Date(
        Date.now() + days * 24 * 60 * 60 * 1000
      );
      const token = await signShareToken(
        deps.tokenSecret,
        { organizationId },
        expiresAt
      );
      return {
        token,
        url: sharePublicUrl(token),
        expiresAt: expiresAt.toISOString(),
      };
    },

    async getPublicSnapshot(token: string): Promise<AslPublicSnapshot> {
      let claims;
      try {
        claims = await verifyShareToken(deps.tokenSecret, token);
      } catch {
        throw new ForbiddenError("Invalid or expired share link");
      }
      const settings = await deps.settings.getOrCreate(claims.organizationId);
      const suppliers = await deps.suppliers.listAllLive(claims.organizationId);
      const orgName = await deps.org.getOrganizationName(claims.organizationId);
      return {
        orgName,
        generatedAt: new Date().toISOString(),
        suppliers,
        settings: {
          lead: settings.lead,
          follow: settings.follow,
          esc: settings.esc,
          interval: settings.interval,
          criteria: settings.criteria,
        },
        overview: buildOverview(
          await deps.suppliers.listAllInOrg(claims.organizationId),
          settings
        ),
      };
    },

    async getUploadContext(token: string) {
      let claims;
      try {
        claims = await verifyUploadToken(deps.tokenSecret, token);
      } catch {
        throw new ForbiddenError("Invalid or expired upload link");
      }
      const supplier = await requireSupplier(
        claims.organizationId,
        claims.supplierId
      );
      const settings = await deps.settings.getOrCreate(claims.organizationId);
      const orgName = await deps.org.getOrganizationName(claims.organizationId);
      return {
        orgName,
        supplier: {
          id: supplier.id,
          name: supplier.name,
          missing: missingDocs(supplier, settings.lead),
          expired: expiredDocs(supplier, settings.lead),
          soon: soonDocs(supplier, settings.lead),
        },
        organizationId: claims.organizationId,
      };
    },

    async preparePublicUpload(
      token: string,
      input: { fileName: string; contentType?: string; fileSize?: number }
    ) {
      let claims;
      try {
        claims = await verifyUploadToken(deps.tokenSecret, token);
      } catch {
        throw new ForbiddenError("Invalid or expired upload link");
      }
      if (!input.fileName?.trim()) {
        throw new ValidationAppError("fileName is required");
      }
      await requireSupplier(claims.organizationId, claims.supplierId);
      return deps.files.createSignedUpload({
        organizationId: claims.organizationId,
        fileName: input.fileName.trim(),
        contentType: input.contentType,
        fileSize: input.fileSize,
      });
    },

    async publicUpload(
      token: string,
      input: PublicAslUploadInput
    ): Promise<AslSupplier> {
      let claims;
      try {
        claims = await verifyUploadToken(deps.tokenSecret, token);
      } catch {
        throw new ForbiddenError("Invalid or expired upload link");
      }
      if (!input.storageInfo?.Bucket || !input.storageInfo.Key) {
        throw new ValidationAppError("storageInfo is required");
      }
      let supplier = await requireSupplier(
        claims.organizationId,
        claims.supplierId
      );
      const type =
        input.type?.trim() ||
        input.storageInfo.Name.replace(/\.[^.]+$/, "") ||
        "Other";
      const exp = input.exp ?? null;
      const ref = input.ref?.trim() ?? "";
      const existing = supplier.docs.find((d) => d.type === type);
      const doc: AslDocument = existing
        ? {
            ...existing,
            exp,
            ref: ref || existing.ref,
            file: input.storageInfo,
            chased: null,
          }
        : {
            id: newEmbeddedId(),
            type,
            exp,
            ref,
            req: isDocRequiredForSupplier(supplier, type),
            chased: null,
            file: input.storageInfo,
          };
      const docs = existing
        ? supplier.docs.map((d) => (d.id === existing.id ? doc : d))
        : [...supplier.docs, doc];
      supplier = {
        ...supplier,
        docs,
        comms: [
          {
            id: newEmbeddedId(),
            date: toIsoDate(startOfToday()),
            type: "Upload",
            subject: `${type} received via secure upload`,
            by: "Supplier portal",
            outcome: "Received",
          },
          ...supplier.comms,
        ],
        trail: appendTrail(
          supplier.trail,
          `${type} uploaded by supplier · expires ${exp ?? "n/a"}`,
          "Supplier portal"
        ),
      };
      const saved = await deps.suppliers.replace(
        claims.organizationId,
        supplier.id,
        supplier,
        "supplier-portal"
      );
      if (!saved) throw new NotFoundError("Supplier not found");
      queueSupplierDoc({
        organizationId: claims.organizationId,
        createdBy: "supplier-portal",
        supplierId: saved.id,
        supplierName: saved.name,
        doc,
      });
      return persistRules(
        claims.organizationId,
        saved,
        "supplier-portal"
      );
    },

    async syncDocumentsToLibrary(
      identity: SecurityIdentity | null | undefined
    ): Promise<AslLibrarySyncResult> {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      const result: AslLibrarySyncResult = {
        scanned: 0,
        created: 0,
        existing: 0,
        failed: 0,
      };
      const suppliers = await deps.suppliers.listAllLive(organizationId);
      for (const supplier of suppliers) {
        for (const doc of supplier.docs || []) {
          if (!doc.file) continue;
          const status = await registerSupplierDoc({
            organizationId,
            createdBy: subjectId,
            supplierId: supplier.id,
            supplierName: supplier.name,
            doc,
          });
          result.scanned += 1;
          if (status === "created") result.created += 1;
          else if (status === "existing") result.existing += 1;
          else if (status === "failed") result.failed += 1;
        }
      }
      return result;
    },

    /** Used by daily chase job. */
    async runDailyChase(organizationId: string): Promise<{
      followUps: number;
      escalations: number;
      evalDueNotices: number;
    }> {
      const settings = await deps.settings.getOrCreate(organizationId);
      const suppliers = await deps.suppliers.listAllLive(organizationId);
      const orgName = await deps.org.getOrganizationName(organizationId);
      const branding = await brandingFor(organizationId);
      const today = startOfToday();
      const todayIso = toIsoDate(today);
      let followUps = 0;
      let escalations = 0;
      let evalDueNotices = 0;

      const orgUsers = await deps.users.listActiveUsers(organizationId);
      const orgEmails = [
        ...new Set(
          orgUsers
            .map((u) => u.email.trim())
            .filter((e) => e.includes("@"))
        ),
      ];

      for (let supplier of suppliers) {
        if (
          supplier.evalDue === todayIso &&
          supplier.evalDueNotifiedOn !== todayIso &&
          supplier.status !== "Prospective" &&
          supplier.status !== "Removed"
        ) {
          try {
            const uploadToken = await signUploadToken(deps.tokenSecret, {
              organizationId,
              supplierId: supplier.id,
            });
            const uploadUrl = uploadPublicUrl(uploadToken);
            const supplierMail = buildEvalDueMail({
              supplier,
              settings,
              orgName,
              actorName: "Alice",
              evalDue: todayIso,
              uploadUrl,
              branding,
            });
            const internalMail = buildEvalDueInternalMail({
              supplier,
              settings,
              orgName,
              evalDue: todayIso,
              branding,
            });

            if (supplier.email.trim()) {
              await deps.email.send({
                to: [supplier.email.trim()],
                subject: supplierMail.subject,
                html: supplierMail.html,
                text: supplierMail.text,
                organizationId,
                from: settings.from,
              });
            }

            if (orgEmails.length) {
              await deps.email.send({
                to: orgEmails,
                subject: internalMail.subject,
                html: internalMail.html,
                text: internalMail.text,
                organizationId,
                from: settings.from,
              });
            }

            await deps.notifications.notifyOrgUsers({
              organizationId,
              supplierId: supplier.id,
              title: `Re-evaluation due: ${supplier.name}`,
              body: `${supplier.name} (${supplier.reference}) is due for re-evaluation today (${todayIso}).`,
            });

            supplier = {
              ...supplier,
              evalDueNotifiedOn: todayIso,
              comms: [
                {
                  id: newEmbeddedId(),
                  date: todayIso,
                  type: "Eval due",
                  subject: supplierMail.subject,
                  by: "Alice",
                  outcome: "Sent to supplier and organisation",
                },
                ...supplier.comms,
              ],
              trail: appendTrail(
                supplier.trail,
                "Evaluation due notification sent by scheduler",
                "Alice"
              ),
            };
            await deps.suppliers.replace(
              organizationId,
              supplier.id,
              supplier,
              "system"
            );
            evalDueNotices += 1;
          } catch {
            // Continue other suppliers
          }
        }

        const outstanding =
          soonDocs(supplier, settings.lead, today).length +
            expiredDocs(supplier, settings.lead, today).length +
            missingDocs(supplier, settings.lead, today).length >
          0;
        if (!outstanding) continue;

        const lastChase = supplier.comms
          .filter((c) => /chase|request|notif|follow/i.test(c.type))
          .sort((a, b) => (a.date < b.date ? 1 : -1))[0];

        const daysSinceChase = lastChase
          ? Math.abs(daysUntil(lastChase.date, today))
          : Number.POSITIVE_INFINITY;

        if (!lastChase || daysSinceChase >= settings.follow) {
          if (supplier.email.trim()) {
            const uploadToken = await signUploadToken(deps.tokenSecret, {
              organizationId,
              supplierId: supplier.id,
            });
            const mail = buildSupplierMail({
              supplier,
              settings,
              orgName,
              actorName: "Alice",
              uploadUrl: uploadPublicUrl(uploadToken),
              today,
              branding,
            });
            const type = lastChase ? "Follow-up" : "Auto chase";
            try {
              await deps.email.send({
                to: [supplier.email.trim()],
                subject: mail.subject,
                html: mail.html,
                text: mail.text,
                organizationId,
                from: settings.from,
              });
              followUps += 1;
              const chased = toIsoDate(today);
              supplier = {
                ...supplier,
                docs: supplier.docs.map((d) => {
                  const hit =
                    soonDocs(supplier, settings.lead, today).some(
                      (x) => x.id === d.id
                    ) ||
                    expiredDocs(supplier, settings.lead, today).some(
                      (x) => x.id === d.id
                    );
                  return hit ? { ...d, chased } : d;
                }),
                comms: [
                  {
                    id: newEmbeddedId(),
                    date: chased,
                    type,
                    subject: mail.subject,
                    by: "Alice",
                    outcome: `Sent · escalate ${toIsoDate(new Date(today.getTime() + settings.esc * 86400000))}`,
                  },
                  ...supplier.comms,
                ],
                trail: appendTrail(
                  supplier.trail,
                  `${type} sent by scheduler`,
                  "Alice"
                ),
              };
              await deps.suppliers.replace(
                organizationId,
                supplier.id,
                supplier,
                "system"
              );
            } catch {
              // Continue other suppliers
            }
          }
        }

        if (lastChase && daysSinceChase >= settings.esc) {
          const alreadyEscalated = supplier.comms.some(
            (c) =>
              /escalation/i.test(c.type) &&
              daysUntil(c.date, today) > -settings.esc
          );
          if (!alreadyEscalated) {
            await deps.tasks.createEscalationTask({
              organizationId,
              supplierId: supplier.id,
              supplierName: supplier.name,
              title: `Supplier documents overdue: ${supplier.name}`,
              description: `No reply after chase. Outstanding documents need buyer follow-up.`,
              createdBy: "system",
            });
            await deps.notifications.notifyEscalation({
              organizationId,
              supplierId: supplier.id,
              title: `Supplier escalation: ${supplier.name}`,
              body: "Document chase escalated after no reply.",
            });
            supplier = {
              ...supplier,
              comms: [
                {
                  id: newEmbeddedId(),
                  date: toIsoDate(today),
                  type: "Escalation",
                  subject: `Escalated to buyer`,
                  by: "Alice",
                  outcome: "Open",
                },
                ...supplier.comms,
              ],
              trail: appendTrail(
                supplier.trail,
                "Escalated to buyer by scheduler",
                "Alice"
              ),
            };
            await deps.suppliers.replace(
              organizationId,
              supplier.id,
              supplier,
              "system"
            );
            escalations += 1;
          }
        }
      }

      return { followUps, escalations, evalDueNotices };
    },

    listOrganizationIds: () => deps.suppliers.listOrganizationIds(),
  };
}

export { randomUUID };
