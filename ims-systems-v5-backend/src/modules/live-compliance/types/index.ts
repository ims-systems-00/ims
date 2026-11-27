/**
 * Live ISO compliance — types.
 *
 * Clause health is computed continuously from module data (training,
 * inventory, audits, risks, incidents, management reviews, legal register)
 * and layered on top of the organisation's existing ISO toolkit clauses
 * (Compliance `ControlStatus`). Prototype: frontend/src/assets/ims-os-live-compliance 1.html
 */

/**
 * Live health is a view over Compliance: authorised as the Compliance
 * resource (read to view, update to snooze). One-click commands are
 * additionally authorised by the owning module's own service.
 */
export const LIVE_COMPLIANCE_RESOURCE = "compliance" as const;

/** ISO standards the live engine evaluates (subset of compliance toolkits). */
export const LIVE_STANDARDS = ["ISO 9001", "ISO 14001", "ISO 45001"] as const;
export type LiveStandard = (typeof LIVE_STANDARDS)[number];

export function isLiveStandard(value: string): value is LiveStandard {
  return (LIVE_STANDARDS as readonly string[]).includes(value);
}

/**
 * not    Not started  — nothing recorded yet / not tracked
 * prog   In progress  — partially in place (e.g. evidence missing)
 * impl   Implemented  — manually marked implemented, not live-monitored
 * sus    Sustained    — in place and in date
 * risk   At risk      — something falls due soon
 * lapsed Lapsed       — overdue / failed; would be a finding today
 */
export const CLAUSE_HEALTH_STATUSES = [
  "not",
  "prog",
  "impl",
  "sus",
  "risk",
  "lapsed",
] as const;
export type ClauseHealthStatus = (typeof CLAUSE_HEALTH_STATUSES)[number];

export const CLAUSE_HEALTH_LABELS: Record<ClauseHealthStatus, string> = {
  not: "Not started",
  prog: "In progress",
  impl: "Implemented",
  sus: "Sustained",
  risk: "At risk",
  lapsed: "Lapsed",
};

/** Modules that own clause rules (also the advice `module` key). */
export const LIVE_MODULES = [
  "compliance",
  "inventory",
  "audits",
  "training",
  "risks",
  "incidents",
  "reviews",
  "documents",
  "suppliers",
  "certificates",
] as const;
export type LiveModule = (typeof LIVE_MODULES)[number];

export function isLiveModule(value: string): value is LiveModule {
  return (LIVE_MODULES as readonly string[]).includes(value);
}

export const LIVE_MODULE_NAMES: Record<LiveModule, string> = {
  compliance: "Compliance",
  inventory: "Inventory",
  audits: "Audits",
  training: "Training",
  risks: "Risks",
  incidents: "Incidents",
  reviews: "Management reviews",
  documents: "Documents",
  suppliers: "Suppliers",
  certificates: "Certificates",
};

export type ClauseEvaluation = {
  status: ClauseHealthStatus;
  /** Plain-English live evidence, e.g. "Sam Patel: CSCS expires 29 Nov 2026". */
  detail: string;
  /** ISO date (YYYY-MM-DD) the clause next falls due, when date-driven. */
  due?: string | null;
};

/* ------------------------------------------------------------------ */
/* Snapshot — normalised module data the pure rules read.              */
/* `tracked: false` means the module (or required fields) is not       */
/* available for this organisation yet → rule reports "Not tracked".   */
/* ------------------------------------------------------------------ */

export type TrainingGapState = "none" | "grace" | "over" | "soon";

export type TrainingSnapshot = {
  tracked: boolean;
  peopleCount: number;
  /** Mandatory requirements that are missing / expired / expiring. */
  gaps: Array<{
    personId: string;
    personName: string;
    competencyId: string;
    competencyName: string;
    state: TrainingGapState;
    /** Expiry date (ISO) when known. */
    next: string | null;
    /** A planned session already includes this person for this competency. */
    booked: boolean;
  }>;
  /** Roles that have people assigned but no required competencies. */
  rolesWithoutRequirements: Array<{ id: string; name: string }>;
  /** Policy acknowledgement competencies (evidence: Acknowledgement). */
  acknowledgements: Array<{
    competencyId: string;
    competencyName: string;
    acknowledged: number;
    required: number;
  }>;
};

export type InventoryCheckSnapshot = {
  assetId: string;
  tag: string;
  name: string;
  category: string;
  /** Measuring & test equipment (ISO 9001 7.1.5) vs operational equipment (8.1). */
  measuring: boolean;
  stage: string;
  checkName: string;
  basis: string;
  nextDue: string | null;
  lastResult: string | null;
};

export type InventorySnapshot = {
  tracked: boolean;
  assetCount: number;
  checks: InventoryCheckSnapshot[];
};

export type AuditFindingSnapshot = {
  id: string;
  auditId: string;
  reference: string;
  text: string;
  clause: string | null;
  dueDate: string | null;
  open: boolean;
  hasEvidence: boolean;
};

export type AuditsSnapshot = {
  tracked: boolean;
  auditCount: number;
  /** Most recent completed internal audit (fallback when no programme). */
  lastCompletedOn: string | null;
  /** Current audit programme cycle (Phase 1 extension; null when not set up). */
  programme: {
    cycleEnd: string | null;
    /** Clause ids in scope per standard. */
    inScope: Partial<Record<LiveStandard, string[]>>;
  } | null;
  /** Clauses covered by a completed audit in the current cycle, per standard. */
  audited: Partial<Record<LiveStandard, string[]>>;
  /** Clauses covered by a scheduled (not completed) audit, per standard. */
  planned: Partial<Record<LiveStandard, string[]>>;
  /** Findings with clause/due/status — empty until audits store them. */
  findings: AuditFindingSnapshot[];
  findingsTracked: boolean;
};

export type RisksSnapshot = {
  tracked: boolean;
  reviewTracked: boolean;
  items: Array<{
    id: string;
    reference: string;
    title: string;
    nextReviewDate: string | null;
    area: string | null;
    score: number;
  }>;
  /** Areas whose near-miss pattern has been reviewed (risk updated since). */
  reviewedPatternAreas: string[];
};

export type IncidentsSnapshot = {
  tracked: boolean;
  /** incidentType / occurredOn / area / investigation fields are available. */
  detailTracked: boolean;
  items: Array<{
    id: string;
    reference: string;
    title: string;
    type: string | null;
    occurredOn: string;
    area: string | null;
    investigation: "not_started" | "in_progress" | "done";
  }>;
};

export type ReviewsSnapshot = {
  tracked: boolean;
  /** Most recent completed management review date. */
  lastHeld: string | null;
  intervalMonths: number | null;
  /** Next scheduled (not completed) review. */
  scheduled: { id: string; date: string } | null;
  inputsTracked: boolean;
  inputs: Array<{ key: string; label: string; ready: boolean }>;
  actions: Array<{ id: string; title: string; due: string | null; open: boolean }>;
};

export type ObjectivesSnapshot = {
  tracked: boolean;
  count: number;
};

export type LegalSnapshot = {
  tracked: boolean;
  lastReviewedOn: string | null;
  reviewIntervalMonths: number;
  duties: Array<{ id: string; name: string; hasEvidence: boolean }>;
};

export type DocumentsSnapshot = {
  tracked: boolean;
  /** Published documents that have a review date. */
  items: Array<{
    id: string;
    repositoryId: string;
    name: string;
    purpose: string;
    reviewDate: string;
    ownerUserIds: string[];
  }>;
};

export type SupplierIssueKind = "expired" | "soon" | "missing" | "eval" | "evalsoon";

export type SuppliersSnapshot = {
  tracked: boolean;
  items: Array<{
    id: string;
    name: string;
    approved: boolean;
    issues: Array<{
      kind: SupplierIssueKind;
      text: string;
      /** Document type (certificate) or null for evaluation issues. */
      docType: string | null;
      docId: string | null;
      due: string | null;
    }>;
  }>;
};

/** The organisation's own certificates (ISO, insurance, accreditations). */
export type CertificatesSnapshot = {
  tracked: boolean;
  items: Array<{ id: string; name: string; standard: string | null; expires: string | null }>;
};

/** Toolkit clauses marked Implemented with no evidence attached or linked. */
export type EvidenceSnapshot = {
  tracked: boolean;
  missing: Array<{ id: string; standard: LiveStandard; clause: string; title: string }>;
};

export type ComplianceSnapshot = {
  /** Evaluation date (YYYY-MM-DD, UTC). */
  today: string;
  standards: LiveStandard[];
  training: TrainingSnapshot;
  inventory: InventorySnapshot;
  audits: AuditsSnapshot;
  risks: RisksSnapshot;
  incidents: IncidentsSnapshot;
  reviews: ReviewsSnapshot;
  objectives: ObjectivesSnapshot;
  legal: LegalSnapshot;
  documents: DocumentsSnapshot;
  suppliers: SuppliersSnapshot;
  certificates: CertificatesSnapshot;
  evidence: EvidenceSnapshot;
};

/* ------------------------------------------------------------------ */
/* Advice                                                              */
/* ------------------------------------------------------------------ */

export const ADVICE_SEVERITIES = ["high", "med", "low"] as const;
export type AdviceSeverity = (typeof ADVICE_SEVERITIES)[number];

/**
 * navigate — open a module screen (deep link) where the user completes the work.
 * execute  — one-click server command (POST /advice/:id/action).
 */
export type AdviceAction =
  | { type: "navigate"; label: string; href: string }
  | { type: "execute"; label: string; command: string; ref: string | null };

export type AdviceItem = {
  /** Deterministic id so snooze/dedupe survive recalculation. */
  id: string;
  module: LiveModule;
  clause: string;
  standards: LiveStandard[];
  severity: AdviceSeverity;
  due: string | null;
  title: string;
  why: string;
  action: AdviceAction;
  /** Optional ALICE offer (Phase 3). */
  offer?: { task: string; label: string; ref?: string | null };
  /** Record-level owners (e.g. document owners) — drives "my actions". */
  ownerUserIds?: string[];
};

/* ------------------------------------------------------------------ */
/* Action centre (Phase 2.5)                                           */
/* ------------------------------------------------------------------ */

/** now: overdue or failing · week: due within 7 days · later: the rest. */
export const ACTION_BUCKETS = ["now", "week", "later"] as const;
export type ActionBucket = (typeof ACTION_BUCKETS)[number];

export type ActionCentreItem = AdviceItem & { bucket: ActionBucket };

export type ActionCentreResponse = {
  evaluatedAt: string | null;
  /** "mine": owned by me (record or clause) + unowned items for admins. */
  scope: "mine" | "all";
  counts: Record<ActionBucket, number> & { total: number };
  /** Audit readiness per standard ("compliant today"). */
  readiness: Array<{
    standard: LiveStandard;
    percentage: number;
    atRisk: number;
    lapsed: number;
    worst: ClauseHealthStatus;
  }>;
  items: ActionCentreItem[];
};

/* ------------------------------------------------------------------ */
/* API DTOs                                                            */
/* ------------------------------------------------------------------ */

export type StoredClauseHealth = {
  status: ClauseHealthStatus;
  detail: string;
  due: string | null;
  ruleId: string | null;
  evaluatedAt: Date;
};

export type LiveClause = {
  /** ControlStatus id. */
  id: string;
  standard: LiveStandard;
  clause: string;
  title: string;
  module: LiveModule | null;
  /** True when a live rule drives the status (false = manual toolkit state). */
  live: boolean;
  status: ClauseHealthStatus;
  detail: string;
  due: string | null;
  evaluatedAt: string | null;
};

export type StandardHealth = {
  standard: LiveStandard;
  total: number;
  sustained: number;
  implemented: number;
  atRisk: number;
  lapsed: number;
  inProgress: number;
  notStarted: number;
  /** (sustained + implemented + atRisk) / total — "compliant today". */
  percentage: number;
  worst: ClauseHealthStatus;
};

export type LiveHealthResponse = {
  evaluatedAt: string | null;
  standards: StandardHealth[];
  clauses: LiveClause[];
};

export type ModuleHealthResponse = {
  module: LiveModule;
  name: string;
  percentage: number;
  worst: ClauseHealthStatus;
  clauses: LiveClause[];
};

export type LiveActivity = {
  id: string;
  source: string;
  text: string;
  at: string;
};
