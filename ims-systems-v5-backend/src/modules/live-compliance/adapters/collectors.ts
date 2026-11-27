/**
 * Live Compliance snapshot collectors.
 *
 * Read-only aggregation over module repositories + their pure rules, with no
 * identity — the same pattern as Relyable's live evidence collectors. Each
 * collector fails soft (module reported as not tracked) so one broken module
 * never blocks the whole evaluation.
 */

import { getAuditModel } from "../../audits/repositories/audit.model";
import { getControlEvidenceModel } from "../../compliance/repositories/control-evidence.model";
import { getControlStatusModel } from "../../compliance/repositories/control-status.model";
import { getDocumentTreeModel } from "../../document-management/repositories/document-tree.model";
import {
  daysUntil as aslDaysUntil,
  expiredDocs,
  lastEval,
  missingDocs,
  nextEvalDate,
  soonDocs,
  startOfToday,
} from "../../supplier/lib/asl-rules";
import { createAslSettingsRepository } from "../../supplier/repositories/asl-settings.repository";
import { createAslSupplierRepository } from "../../supplier/repositories/asl-supplier.repository";
import type { AslSettings, AslSupplier } from "../../supplier/types";
import { getTenderCertificateModel } from "../../tender/repositories/tender-certificate.model";
import { buildSchedule } from "../../inventory/lib/inventory-rules";
import { createInventoryAssetRepository } from "../../inventory/repositories/inventory-asset.repository";
import { createInventorySettingsRepository } from "../../inventory/repositories/inventory-settings.repository";
import { getIncidentModel } from "../../incidents/repositories/incident.model";
import { getKpiObjectiveModel } from "../../kpi-objectives/repositories/kpi-objective.model";
import { getManagementReviewModel } from "../../management-reviews/repositories/management-review.model";
import { mergeReviewInputs } from "../../management-reviews/types";
import { getRiskModel } from "../../risks/repositories/risk.model";
import {
  activePeople,
  findRole,
  gaps,
  matrixRow,
} from "../../training/lib/training-rules";
import { createTrainingCompetencyRepository } from "../../training/repositories/training-competency.repository";
import { createTrainingPersonRepository } from "../../training/repositories/training-person.repository";
import { createTrainingRecordRepository } from "../../training/repositories/training-record.repository";
import { createTrainingRoleRepository } from "../../training/repositories/training-role.repository";
import { createTrainingSessionRepository } from "../../training/repositories/training-session.repository";
import { createTrainingSettingsRepository } from "../../training/repositories/training-settings.repository";
import type { TrainingModel } from "../../training/types";
import { PATTERN_WINDOW_DAYS } from "../lib/clause-rules";
import { daysUntil, formatDay, isoDay } from "../lib/dates";
import type { SnapshotCollectorPort } from "../ports";
import {
  isLiveStandard,
  type AuditsSnapshot,
  type IncidentsSnapshot,
  type LiveStandard,
  type ReviewsSnapshot,
  type SuppliersSnapshot,
  type TrainingSnapshot,
} from "../types";

const INTERVAL_MONTHS: Record<string, number> = {
  Monthly: 1,
  Quarterly: 3,
  "Half yearly": 6,
  Yearly: 12,
};

function dayOf(value: unknown): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : isoDay(d);
}

/* ------------------------------ Training ------------------------------ */

async function loadTrainingModel(organizationId: string): Promise<TrainingModel> {
  const [settings, competencies, roles, people, records, sessions] =
    await Promise.all([
      createTrainingSettingsRepository().getOrCreate(organizationId),
      createTrainingCompetencyRepository().list(organizationId, { includeArchived: true }),
      createTrainingRoleRepository().list(organizationId),
      createTrainingPersonRepository().list(organizationId),
      createTrainingRecordRepository().list(organizationId),
      createTrainingSessionRepository().list(organizationId),
    ]);
  return {
    org: settings.orgName || "",
    settings: {
      leadDays: settings.leadDays,
      inductionDays: settings.inductionDays,
      reminderDays: settings.reminderDays,
      inviteSubject: settings.inviteSubject,
      inviteBody: settings.inviteBody,
      organiserEmail: settings.organiserEmail,
      allowSelfUpload: settings.allowSelfUpload,
      requireVerification: settings.requireVerification,
      selfTokenDays: settings.selfTokenDays,
      siteLabel: settings.siteLabel,
      sites: settings.sites,
      providers: settings.providers,
    },
    competencies,
    roles,
    people,
    records,
    sessions,
    log: settings.log,
  };
}

/** Pure: TrainingModel → snapshot slice (exported for tests). */
export function trainingSnapshotFromModel(
  M: TrainingModel,
  today: string
): TrainingSnapshot {
  const now = new Date(`${today}T00:00:00Z`);
  const people = activePeople(M);

  const booked = new Set(
    (M.sessions || [])
      .filter((s) => s.status === "Planned")
      .flatMap((s) =>
        s.attendees
          .filter((pid) => s.rsvp?.[pid]?.status !== "declined")
          .map((pid) => `${s.cid}:${pid}`)
      )
  );

  const gapItems = gaps(M, now).map((g) => ({
    personId: g.person.id,
    personName: g.person.name,
    competencyId: g.comp.id,
    competencyName: g.comp.name,
    state: g.st as TrainingSnapshot["gaps"][number]["state"],
    next: g.next,
    booked: booked.has(`${g.comp.id}:${g.person.id}`),
  }));

  const rolesInUse = new Map<string, { id: string; name: string }>();
  for (const p of people) {
    for (const rid of p.roles || []) {
      const role = findRole(M, rid);
      if (role && !(role.mandatory || []).length && role.key !== "all") {
        rolesInUse.set(role.id, { id: role.id, name: role.name });
      }
    }
  }

  const ackComps = (M.competencies || []).filter(
    (c) => c.evidence === "Acknowledgement" && !c.archived
  );
  const acknowledgements = ackComps.map((comp) => {
    let required = 0;
    let acknowledged = 0;
    for (const p of people) {
      const cell = matrixRow(M, p, now).find(
        (c) => c.req.comp.id === comp.id && c.req.level === "mandatory"
      );
      if (!cell) continue;
      required += 1;
      if (cell.st === "ok" || cell.st === "soon") acknowledged += 1;
    }
    return {
      competencyId: comp.id,
      competencyName: comp.name,
      acknowledged,
      required,
    };
  });

  return {
    tracked: true,
    peopleCount: people.length,
    gaps: gapItems.filter((g) => g.state !== "grace"),
    rolesWithoutRequirements: [...rolesInUse.values()],
    acknowledgements,
  };
}

export function createTrainingSnapshotCollector(): SnapshotCollectorPort {
  return {
    async collect(organizationId, today) {
      const model = await loadTrainingModel(organizationId);
      return { training: trainingSnapshotFromModel(model, today) };
    },
  };
}

/* ------------------------------ Inventory ----------------------------- */

export function createInventorySnapshotCollector(): SnapshotCollectorPort {
  const assets = createInventoryAssetRepository();
  const settingsRepo = createInventorySettingsRepository();
  return {
    async collect(organizationId, today) {
      const [all, settings] = await Promise.all([
        assets.listAll(organizationId, { includeDisposed: false }),
        settingsRepo.getOrCreate(organizationId),
      ]);
      const rows = buildSchedule(all, {}, new Date(`${today}T00:00:00Z`), {
        leadDays: settings.leadDays,
        categoryOverrides: settings.categoryOverrides,
        competentPersons: settings.competentPersons ?? [],
      });
      return {
        inventory: {
          tracked: true,
          assetCount: all.length,
          checks: rows.map((r) => ({
            assetId: r.assetId,
            tag: r.tag,
            name: r.name,
            category: r.category,
            measuring: r.category === "measuring",
            stage: r.stage,
            checkName: r.checkName,
            basis: r.basis,
            nextDue: r.nextDue ?? null,
            lastResult: r.lastResult ?? null,
          })),
        },
      };
    },
  };
}

/* ------------------------------- Audits ------------------------------- */

type AuditLean = {
  _id: unknown;
  reference: string;
  type: string;
  startDate: Date;
  completed?: { status?: boolean; on?: Date | null } | null;
  complianceLinks?: Array<{ toolkitId: string; clauseIds?: string[] }>;
  identifications?: Array<{
    id: string;
    nonConformity: string;
    clause?: string | null;
    dueDate?: Date | null;
    status?: string | null;
    evidenceIds?: string[];
  }>;
};

/** Pure: audit docs → snapshot slice (exported for tests). */
export function auditsSnapshotFromDocs(
  docs: AuditLean[],
  today: string
): AuditsSnapshot {
  const internal = docs.filter((d) => d.type === "Internal");
  const yearAgo = `${Number(today.slice(0, 4)) - 1}${today.slice(4)}`;
  const audited: Partial<Record<LiveStandard, Set<string>>> = {};
  const planned: Partial<Record<LiveStandard, Set<string>>> = {};
  let lastCompletedOn: string | null = null;

  for (const audit of internal) {
    const done = Boolean(audit.completed?.status);
    const when = dayOf(done ? audit.completed?.on ?? audit.startDate : audit.startDate);
    if (done && when && (!lastCompletedOn || when > lastCompletedOn)) {
      lastCompletedOn = when;
    }
    const bucket = done ? audited : planned;
    if (done && when && when < yearAgo) continue;
    for (const link of audit.complianceLinks ?? []) {
      if (!isLiveStandard(link.toolkitId)) continue;
      const set = (bucket[link.toolkitId] ??= new Set());
      for (const clause of link.clauseIds ?? []) set.add(clause.trim());
    }
  }

  const findingsTracked = docs.some((d) =>
    (d.identifications ?? []).some((f) => f.status != null || f.dueDate != null)
  );
  const findings = docs.flatMap((d) =>
    (d.identifications ?? [])
      .map((f, index) => ({ f, index }))
      .filter(({ f }) => f.status != null || f.dueDate != null)
      .map(({ f, index }) => ({
        id: f.id,
        auditId: String(d._id),
        reference: `${d.reference} NC-${index + 1}`,
        text: f.nonConformity,
        clause: f.clause ?? null,
        dueDate: dayOf(f.dueDate),
        open: f.status !== "closed",
        hasEvidence: (f.evidenceIds ?? []).length > 0,
      }))
  );

  const toRecord = (src: Partial<Record<LiveStandard, Set<string>>>) =>
    Object.fromEntries(
      Object.entries(src).map(([k, v]) => [k, [...(v as Set<string>)]])
    ) as Partial<Record<LiveStandard, string[]>>;

  return {
    tracked: true,
    auditCount: internal.length,
    lastCompletedOn,
    programme: null,
    audited: toRecord(audited),
    planned: toRecord(planned),
    findings,
    findingsTracked,
  };
}

export function createAuditsSnapshotCollector(): SnapshotCollectorPort {
  return {
    async collect(organizationId, today) {
      const docs = (await getAuditModel()
        .find(
          { organizationId, deletedAt: null },
          {
            reference: 1,
            type: 1,
            startDate: 1,
            completed: 1,
            complianceLinks: 1,
            identifications: 1,
          }
        )
        .lean()
        .exec()) as unknown as AuditLean[];
      return { audits: auditsSnapshotFromDocs(docs, today) };
    },
  };
}

/* -------------------------------- Risks ------------------------------- */

export function createRisksSnapshotCollector(): SnapshotCollectorPort {
  return {
    async collect(organizationId, today) {
      const docs = (await getRiskModel()
        .find(
          { organizationId, deletedAt: null },
          { reference: 1, title: 1, currentScore: 1, nextReviewDate: 1, lastReviewedOn: 1, area: 1 }
        )
        .lean()
        .exec()) as unknown as Array<{
        _id: unknown;
        reference: string;
        title: string;
        currentScore?: { total?: number } | null;
        nextReviewDate?: Date | null;
        lastReviewedOn?: Date | null;
        area?: string | null;
      }>;
      const items = docs.map((d) => ({
        id: String(d._id),
        reference: d.reference,
        title: d.title,
        nextReviewDate: dayOf(d.nextReviewDate),
        area: d.area?.trim() || null,
        score: d.currentScore?.total ?? 0,
      }));
      return {
        risks: {
          tracked: true,
          reviewTracked: items.some((i) => i.nextReviewDate),
          items,
          // A near-miss pattern counts as reviewed once a risk in that area
          // has been reviewed within the pattern window.
          reviewedPatternAreas: [
            ...new Set(
              docs
                .filter((d) => {
                  const reviewed = dayOf(d.lastReviewedOn);
                  return (
                    d.area?.trim() &&
                    reviewed &&
                    daysUntil(reviewed, today) >= -PATTERN_WINDOW_DAYS
                  );
                })
                .map((d) => d.area!.trim())
            ),
          ],
        },
      };
    },
  };
}

/* ------------------------------ Incidents ----------------------------- */

type IncidentLean = {
  _id: unknown;
  reference: string;
  title: string;
  raisedOn?: Date | null;
  createdOn?: Date | null;
  occurredOn?: Date | null;
  incidentType?: string | null;
  area?: string | null;
  resolved?: { status?: boolean } | null;
  investigation?: { status?: string | null } | null;
};

/** Pure: incident docs → snapshot slice (exported for tests). */
export function incidentsSnapshotFromDocs(docs: IncidentLean[]): IncidentsSnapshot {
  const detailTracked = docs.some((d) => d.investigation?.status != null);
  return {
    tracked: true,
    detailTracked,
    items: docs.map((d) => {
      const status = d.investigation?.status;
      // Legacy incidents (before investigation tracking) are treated as
      // handled unless still unresolved — avoids nagging about old records.
      // A resolved incident's resolution records the outcome → investigated.
      const investigation: IncidentsSnapshot["items"][number]["investigation"] =
        d.resolved?.status
          ? "done"
          : status === "done" || status === "in_progress" || status === "not_started"
            ? status
            : "in_progress";
      return {
        id: String(d._id),
        reference: d.reference,
        title: d.title,
        type: d.incidentType ?? null,
        occurredOn: dayOf(d.occurredOn ?? d.raisedOn ?? d.createdOn) ?? isoDay(),
        area: d.area?.trim() || null,
        investigation,
      };
    }),
  };
}

export function createIncidentsSnapshotCollector(): SnapshotCollectorPort {
  return {
    async collect(organizationId) {
      const docs = (await getIncidentModel()
        .find(
          { organizationId, deletedAt: null },
          {
            reference: 1,
            title: 1,
            raisedOn: 1,
            createdOn: 1,
            occurredOn: 1,
            incidentType: 1,
            area: 1,
            resolved: 1,
            investigation: 1,
          }
        )
        .lean()
        .exec()) as unknown as IncidentLean[];
      return { incidents: incidentsSnapshotFromDocs(docs) };
    },
  };
}

/* ------------------------- Management reviews ------------------------- */

type ReviewLean = {
  _id: unknown;
  date: Date;
  interval: string;
  completed?: { status?: boolean; on?: Date | null } | null;
  inputs?: Array<{ key: string; ready?: boolean; note?: string }>;
};

/** Pure: review docs → snapshot slice (exported for tests). */
export function reviewsSnapshotFromDocs(
  docs: ReviewLean[],
  today: string
): ReviewsSnapshot {
  const completed = docs
    .filter((d) => d.completed?.status)
    .map((d) => ({ d, day: dayOf(d.date)! }))
    .sort((a, b) => b.day.localeCompare(a.day));
  const upcoming = docs
    .filter((d) => !d.completed?.status)
    .map((d) => ({ d, day: dayOf(d.date)! }))
    .sort((a, b) => a.day.localeCompare(b.day));
  const last = completed[0] ?? null;
  const next = upcoming.find((u) => u.day >= today) ?? upcoming[0] ?? null;
  // The 9.3.2 inputs checklist of the next scheduled review.
  const inputs = next ? mergeReviewInputs(next.d.inputs) : [];
  return {
    tracked: true,
    lastHeld: last?.day ?? null,
    intervalMonths: INTERVAL_MONTHS[(last ?? next)?.d.interval ?? ""] ?? 12,
    scheduled: next ? { id: String(next.d._id), date: next.day } : null,
    inputsTracked: inputs.length > 0,
    inputs: inputs.map((i) => ({ key: i.key, label: i.label, ready: i.ready })),
    actions: [],
  };
}

export function createReviewsSnapshotCollector(): SnapshotCollectorPort {
  return {
    async collect(organizationId, today) {
      const [docs, objectives] = await Promise.all([
        getManagementReviewModel()
          .find(
            { organizationId, deletedAt: null },
            { date: 1, interval: 1, completed: 1, inputs: 1 }
          )
          .lean()
          .exec() as unknown as Promise<ReviewLean[]>,
        getKpiObjectiveModel().countDocuments({ organizationId }).exec(),
      ]);
      return {
        reviews: reviewsSnapshotFromDocs(docs, today),
        objectives: { tracked: true, count: objectives },
      };
    },
  };
}

/* ---------------------------- Legal register --------------------------- */

/** Reads through the Legal register service (identity-free read). */
export function createLegalSnapshotCollector(source: {
  registerForOrganization(organizationId: string): Promise<{
    settings: { lastReviewedOn: Date | null; reviewIntervalMonths: number };
    duties: Array<{ id: string; name: string; evidence: unknown[] }>;
  }>;
}): SnapshotCollectorPort {
  return {
    async collect(organizationId) {
      const register = await source.registerForOrganization(organizationId);
      return {
        legal: {
          tracked: true,
          lastReviewedOn: dayOf(register.settings.lastReviewedOn),
          reviewIntervalMonths: register.settings.reviewIntervalMonths,
          duties: register.duties.map((d) => ({
            id: d.id,
            name: d.name,
            hasEvidence: d.evidence.length > 0,
          })),
        },
      };
    },
  };
}

/* ------------------------------------------------------------------ */
/* Phase 2.5: documents, suppliers, certificates, clause evidence      */
/* ------------------------------------------------------------------ */

export function createDocumentsSnapshotCollector(): SnapshotCollectorPort {
  return {
    async collect(organizationId) {
      const docs = await getDocumentTreeModel()
        .find(
          {
            organizationId,
            deletedAt: null,
            type: "document",
            status: "Published",
            "documentData.reviewDate": { $ne: null },
          },
          { name: 1, repositoryId: 1, "documentData.purpose": 1, "documentData.reviewDate": 1, "documentData.owners": 1 }
        )
        .lean()
        .exec();
      return {
        documents: {
          tracked: true,
          items: docs.flatMap((d) => {
            const reviewDate = dayOf(d.documentData?.reviewDate);
            if (!reviewDate) return [];
            return [
              {
                id: String(d._id),
                repositoryId: d.repositoryId,
                name: d.name,
                purpose: d.documentData?.purpose ?? "Document",
                reviewDate,
                ownerUserIds: [...(d.documentData?.owners ?? [])],
              },
            ];
          }),
        },
      };
    },
  };
}

/** Certificates and evaluations per supplier (ASL rules, dated). */
export function suppliersSnapshotFromAsl(
  suppliers: AslSupplier[],
  settings: Pick<AslSettings, "lead" | "interval">,
  today: string
): SuppliersSnapshot {
  const day = startOfToday(new Date(`${today}T00:00:00Z`));
  return {
    tracked: true,
    items: suppliers.map((sup) => {
      const issues: SuppliersSnapshot["items"][number]["issues"] = [];
      for (const d of expiredDocs(sup, settings.lead, day)) {
        issues.push({ kind: "expired", text: `${d.type} expired ${formatIso(d.exp)}`, docType: d.type, docId: d.id, due: d.exp });
      }
      for (const d of soonDocs(sup, settings.lead, day)) {
        issues.push({ kind: "soon", text: `${d.type} expires ${formatIso(d.exp)}`, docType: d.type, docId: d.id, due: d.exp });
      }
      for (const r of missingDocs(sup, settings.lead, day)) {
        issues.push({ kind: "missing", text: `${r.replace(/\|/g, " or ")} not on file`, docType: r, docId: null, due: null });
      }
      if (sup.status !== "Prospective") {
        const next = nextEvalDate(sup, settings.interval);
        if (!lastEval(sup)) {
          issues.push({ kind: "eval", text: "No evaluation recorded", docType: null, docId: null, due: null });
        } else if (next && aslDaysUntil(next, day) < 0) {
          issues.push({ kind: "eval", text: `Re-evaluation overdue since ${formatIso(next)}`, docType: null, docId: null, due: next });
        } else if (next && aslDaysUntil(next, day) <= 30) {
          issues.push({ kind: "evalsoon", text: `Re-evaluation due ${formatIso(next)}`, docType: null, docId: null, due: next });
        }
      }
      return {
        id: sup.id,
        name: sup.name,
        approved: sup.status === "Approved" || sup.status === "Conditional",
        issues,
      };
    }),
  };
}

function formatIso(value: string | null | undefined): string {
  return value ? formatDay(value.slice(0, 10)) : "";
}

export function createSuppliersSnapshotCollector(): SnapshotCollectorPort {
  return {
    async collect(organizationId, today) {
      const suppliers = (await createAslSupplierRepository().listAllLive(organizationId)).filter(
        (s) => s.status !== "Suspended"
      );
      // Only touch settings (getOrCreate) when the organisation uses the ASL.
      if (!suppliers.length) return { suppliers: { tracked: true, items: [] } };
      const settings = await createAslSettingsRepository("").getOrCreate(organizationId);
      return { suppliers: suppliersSnapshotFromAsl(suppliers, settings, today) };
    },
  };
}

export function createCertificatesSnapshotCollector(): SnapshotCollectorPort {
  return {
    async collect(organizationId) {
      const certs = await getTenderCertificateModel()
        .find({ organizationId }, { name: 1, standard: 1, expires: 1 })
        .lean()
        .exec();
      return {
        certificates: {
          tracked: true,
          items: certs.map((c) => ({
            id: String(c._id),
            name: c.name,
            standard: c.standard?.trim() || null,
            expires: dayOf(c.expires),
          })),
        },
      };
    },
  };
}

/** Leaf clauses marked Implemented with no attachment and no linked evidence. */
export function createEvidenceSnapshotCollector(): SnapshotCollectorPort {
  return {
    async collect(organizationId) {
      const rows = await getControlStatusModel()
        .find(
          {
            organizationId,
            name: { $in: ["ISO 9001", "ISO 14001", "ISO 45001"] },
            state: "Implemented",
            deletedAt: null,
            $or: [{ childrenClauses: { $size: 0 } }, { childrenClauses: { $exists: false } }],
            $and: [{ $or: [{ evidences: { $size: 0 } }, { evidences: { $exists: false } }] }],
          },
          { name: 1, clause: 1, title: 1 }
        )
        .lean()
        .exec();
      if (!rows.length) return { evidence: { tracked: true, missing: [] } };
      const linked = new Set(
        (
          await getControlEvidenceModel().distinct("controlStatusId", {
            organizationId,
            deletedAt: null,
            controlStatusId: { $in: rows.map((r) => String(r._id)) },
          })
        ).map(String)
      );
      return {
        evidence: {
          tracked: true,
          missing: rows
            .filter((r) => !linked.has(String(r._id)))
            .map((r) => ({
              id: String(r._id),
              standard: r.name as LiveStandard,
              clause: r.clause,
              title: r.title,
            })),
        },
      };
    },
  };
}

/** Production collectors for module data (legal register is wired separately). */
export function createLiveSnapshotCollectors(): SnapshotCollectorPort[] {
  return [
    createDocumentsSnapshotCollector(),
    createSuppliersSnapshotCollector(),
    createCertificatesSnapshotCollector(),
    createEvidenceSnapshotCollector(),
    createTrainingSnapshotCollector(),
    createInventorySnapshotCollector(),
    createAuditsSnapshotCollector(),
    createRisksSnapshotCollector(),
    createIncidentsSnapshotCollector(),
    createReviewsSnapshotCollector(),
  ];
}
