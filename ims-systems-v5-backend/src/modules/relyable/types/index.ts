/**
 * Relyable rating module — domain types (Standard v1.1).
 * Product requirements: frontend/src/assets/relyable-platform/SPECIFICATION.md
 */

export const RELYABLE_RESOURCE = "relyable" as const;

export const RELYABLE_ATTRS = [
  "employs",
  "sites",
  "premises",
  "contractor",
  "vehicles",
  "lifting",
  "food",
  "regulated",
  "data",
] as const;
export type RelyableAttr = (typeof RELYABLE_ATTRS)[number];

export const RELYABLE_FAMILIES = [
  "construction",
  "engineering",
  "transport",
  "facilities",
  "care",
  "food",
  "hospitality",
  "professional",
  "security",
  "education",
  "charity",
  "other",
] as const;
export type RelyableFamily = (typeof RELYABLE_FAMILIES)[number];

export const RELYABLE_SIZE_BANDS = [
  "1-10",
  "11-50",
  "51-250",
  "251+",
  "unknown",
] as const;
export type RelyableSizeBand = (typeof RELYABLE_SIZE_BANDS)[number];

export const RELYABLE_EVIDENCE_STATUSES = [
  "valid",
  "partial",
  "fail",
  "expired",
  "adverse",
  "clear",
] as const;
export type RelyableEvidenceStatus =
  (typeof RELYABLE_EVIDENCE_STATUSES)[number];

export const RELYABLE_APPLICABILITY_STATES = [
  "required",
  "expected",
  "optional",
  "na",
] as const;
export type RelyableApplicabilityState =
  (typeof RELYABLE_APPLICABILITY_STATES)[number];

export const RELYABLE_BANDS = ["A", "B", "C", "D", "E"] as const;
export type RelyableBand = (typeof RELYABLE_BANDS)[number];

export type RelyableAttrs = Record<RelyableAttr, 0 | 1>;

export type RelyableScope = {
  family: RelyableFamily;
  sizeBand: RelyableSizeBand;
  attrs: RelyableAttrs;
  confirmed: boolean;
  declarations: Array<{
    attr: RelyableAttr;
    contradicted: boolean;
    reason?: string;
  }>;
};

export type RelyableCapFacts = {
  accountsOverdue?: boolean;
  insolvency?: boolean;
  enforcement?: boolean;
  disqualifiedDirector?: boolean;
  riddorOpen?: boolean;
};

export type RelyableEvidenceSubject = {
  kind: string;
  id: string;
};

export type RelyableEvidenceItem = {
  id: string;
  organizationId: string;
  type: string;
  subject: RelyableEvidenceSubject | null;
  status: RelyableEvidenceStatus;
  observedAt: string;
  validUntil: string | null;
  payload: Record<string, unknown>;
  level: 0 | 1 | 2 | 3;
  source: string;
  disputed: boolean;
  prevHash: string | null;
  hash: string;
  at: string;
  createdAt: string;
  updatedAt: string;
};

export type EmitEvidenceInput = {
  type: string;
  subject?: RelyableEvidenceSubject | null;
  status: RelyableEvidenceStatus;
  observedAt: string;
  validUntil?: string | null;
  payload?: Record<string, unknown>;
  level: 0 | 1 | 2 | 3;
  source: string;
  disputed?: boolean;
};

export type RelyableCap = {
  limit: number | null;
  reason: string;
};

export type RelyableExplainRow = {
  type: string;
  domain: string;
  state: RelyableApplicabilityState;
  weight: number;
  score: number;
  level: number | null;
  count: number;
};

export type RelyableSnapshot = {
  id: string;
  organizationId: string;
  score: number;
  raw: number;
  band: RelyableBand;
  bandName: string;
  tier: number;
  verifiedRatio: number;
  domains: Record<string, number | null>;
  caps: RelyableCap[];
  explain: RelyableExplainRow[];
  modelVersion: string;
  computedAt: string;
  reason: string;
  createdAt: string;
};

export type RelyableSettings = {
  id: string;
  organizationId: string;
  companyNumber: string | null;
  legalName: string | null;
  sic: string[];
  employees: number | null;
  scope: RelyableScope;
  facts: RelyableCapFacts;
  listedCertifications: string[];
  enabled: boolean;
  lastSyncedAt: string | null;
  updatedBy: string | null;
  updatedOn: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UpdateRelyableSettingsInput = {
  companyNumber?: string | null;
  legalName?: string | null;
  sic?: string[];
  employees?: number | null;
  facts?: RelyableCapFacts;
  listedCertifications?: string[];
  enabled?: boolean;
};

export type UpdateRelyableScopeInput = {
  family?: RelyableFamily;
  sizeBand?: RelyableSizeBand;
  attrs?: Partial<RelyableAttrs>;
  confirmed?: boolean;
};

export type RelyableModuleContributionItem = {
  type: string;
  label: string;
  state: RelyableApplicabilityState;
  points: number;
  max: number;
  score: number | null;
  tier: number | null;
  count: number;
};

export type RelyableModuleContribution = {
  id: string;
  name: string;
  emits: string;
  points: number;
  max: number;
  share: number;
  gap: number;
  items: RelyableModuleContributionItem[];
};

export type RelyableRaiseItItem = {
  type: string;
  level: number;
  from: number;
  to: number;
  delta: number;
  afterCap: boolean;
  label: string;
};

export type RelyableNextRisk = {
  type: string;
  in: number;
  what: "expired" | "expires" | "decays";
  validUntil?: string;
  halfLife?: number;
  label: string;
};

export type RelyableDashboard = {
  rating: number;
  band: RelyableBand;
  bandName: string;
  tier: number;
  verifiedRatio: number;
  domains: Record<string, number | null>;
  caps: RelyableCap[];
  scope: RelyableScope;
  listedCertifications: string[];
  modelVersion: string;
  computedAt: string;
  lastSyncedAt: string | null;
  weekDelta: number | null;
  weekDeltaReason: string | null;
  modules: RelyableModuleContribution[];
  raiseIt: RelyableRaiseItItem[];
  nextRisks: RelyableNextRisk[];
  riskIndicators: { clear: number; total: number };
  chainValid: boolean;
};

export type RelyableSyncResult = {
  emitted: number;
  duplicates: number;
  dashboard: RelyableDashboard;
};
