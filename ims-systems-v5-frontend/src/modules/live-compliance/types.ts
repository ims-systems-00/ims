/**
 * Live ISO compliance — frontend types (mirror backend DTOs).
 * Backend: ims-systems-v5-backend/src/modules/live-compliance
 */

export const LIVE_STANDARDS = ["ISO 9001", "ISO 14001", "ISO 45001"] as const;
export type LiveStandard = (typeof LIVE_STANDARDS)[number];

export const CLAUSE_HEALTH_STATUSES = [
  "not",
  "prog",
  "impl",
  "sus",
  "risk",
  "lapsed",
] as const;
export type ClauseHealthStatus = (typeof CLAUSE_HEALTH_STATUSES)[number];

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

/** Where each live module lives in the app (clause table "Module" links). */
export const LIVE_MODULE_PATHS: Record<LiveModule, string> = {
  compliance: "/compliance",
  inventory: "/inventory",
  audits: "/audits",
  training: "/training",
  risks: "/risks",
  incidents: "/incidents",
  reviews: "/management-reviews",
  documents: "/documents",
  suppliers: "/suppliers",
  certificates: "/tender?view=library",
};

export type LiveClause = {
  id: string;
  standard: LiveStandard;
  clause: string;
  title: string;
  module: LiveModule | null;
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

export type AdviceSeverity = "high" | "med" | "low";

export type AdviceAction =
  | { type: "navigate"; label: string; href: string }
  | { type: "execute"; label: string; command: string; ref: string | null };

export type AdviceItem = {
  id: string;
  module: LiveModule;
  clause: string;
  standards: LiveStandard[];
  severity: AdviceSeverity;
  due: string | null;
  title: string;
  why: string;
  action: AdviceAction;
  offer?: { task: string; label: string; ref?: string | null };
  ownerUserIds?: string[];
};

/** now: overdue / failing · week: due within 7 days · later: the rest. */
export type ActionBucket = "now" | "week" | "later";
export type ActionCentreItem = AdviceItem & { bucket: ActionBucket };

export type ActionCentreResponse = {
  evaluatedAt: string | null;
  scope: "mine" | "all";
  counts: Record<ActionBucket, number> & { total: number };
  readiness: Array<{
    standard: LiveStandard;
    percentage: number;
    atRisk: number;
    lapsed: number;
    worst: ClauseHealthStatus;
  }>;
  items: ActionCentreItem[];
};

export type AdviceList = { items: AdviceItem[]; total: number };

export type LiveActivity = {
  id: string;
  source: string;
  text: string;
  at: string;
};

/* ------------------------------ ALICE (Phase 3) ------------------------------ */

export type AliceTaskId =
  | "explain_clause"
  | "gap_analysis"
  | "training_for_role"
  | "toolbox_talk"
  | "legal_register_review"
  | "audit_checklist"
  | "draft_risk_assessment"
  | "incident_root_cause"
  | "management_review_pack";

export type AliceDraftStatus = "pending" | "approved" | "discarded" | "ready";

export type AliceDraft = {
  id: string;
  task: AliceTaskId;
  ref: string | null;
  title: string;
  status: AliceDraftStatus;
  output: unknown;
  markdown: string;
  applyLabel: string | null;
  createdBy: string;
  createdAt: string;
  decidedBy: string | null;
  decidedByName: string | null;
  decidedAt: string | null;
  appliedMessage: string | null;
};

export type AliceRunEvent =
  | { type: "status"; message: string }
  | { type: "draft"; draft: AliceDraft }
  | { type: "error"; message: string };

/* ------------------------------ ISO journey ------------------------------- */

export type JourneyStep = {
  id: string;
  index: number;
  title: string;
  clauses: string[];
  module: LiveModule;
  asks: string;
  evidence: string;
  href: string;
  status: "done" | "now" | "todo";
  auto: boolean;
  clauseStates: Array<{ clause: string; standard: string; status: ClauseHealthStatus }>;
};

export type JourneyResponse = {
  done: number;
  total: number;
  next: string | null;
  steps: JourneyStep[];
};
