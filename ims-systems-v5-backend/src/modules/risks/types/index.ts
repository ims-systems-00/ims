/**
 * Risk Management domain types (organisation risk register).
 * Spec: docs/module-specifications/risk-management.md
 */

export const RISK_TYPES = [
  "Hardware",
  "Software",
  "People",
  "Premise",
  "Organisational",
  "Clinical",
] as const;
export type RiskType = (typeof RISK_TYPES)[number];

/** Types that may link to an inventory asset. */
export const ASSET_LINKABLE_RISK_TYPES: RiskType[] = [
  "Hardware",
  "Software",
  "People",
  "Premise",
];

export function isAssetLinkableRiskType(type: RiskType): boolean {
  return (ASSET_LINKABLE_RISK_TYPES as readonly string[]).includes(type);
}

/** Score band colour guidance from the specification (list UI). */
export function riskScoreBand(score: number): "low" | "medium" | "high" {
  if (score <= 10) return "low";
  if (score <= 15) return "medium";
  return "high";
}

/**
 * Display status precedence: Mitigated → Accepted → Escalated → Open.
 * Spec § Terminology.
 */
export type RiskDisplayStatus =
  | "Open"
  | "Escalated"
  | "Mitigated"
  | "Accepted";

export function deriveDisplayStatus(risk: {
  mitigated: { status: boolean };
  accepted: { status: boolean };
  escalated: { status: boolean };
}): RiskDisplayStatus {
  if (risk.mitigated.status) return "Mitigated";
  if (risk.accepted.status) return "Accepted";
  if (risk.escalated.status) return "Escalated";
  return "Open";
}

export type RiskScorePair = {
  likelihood: number;
  consequence: number;
  total: number;
};

export type LifecycleFlag = {
  status: boolean;
  by: string | null;
  on: Date | null;
};

export type RiskAttachment = {
  id: string;
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
  storageKey?: string;
  url?: string;
  uploadedBy: string;
  uploadedAt: Date;
};

export type ComplianceLink = {
  toolkitId: string;
  clauseIds: string[];
};

export type RiskSource = {
  moduleType: string;
  moduleId: string;
};

export type RiskActivityEntry = {
  id: string;
  type: string;
  message: string;
  actorId: string | null;
  at: Date;
};

export type Risk = {
  id: string;
  organizationId: string;
  reference: string;
  title: string;
  description: string;
  type: RiskType;
  businessUnitId?: string;
  categoryId?: string;
  assetId?: string;
  ownerId?: string;
  initialScore: RiskScorePair;
  currentScore: RiskScorePair;
  mitigationText?: string;
  mitigated: LifecycleFlag;
  acceptanceRationale?: string;
  decisionMaker?: string;
  accepted: LifecycleFlag;
  escalated: LifecycleFlag;
  attachments: RiskAttachment[];
  complianceLinks: ComplianceLink[];
  source?: RiskSource;
  activity: RiskActivityEntry[];
  raisedBy: string;
  raisedOn: Date;
  updatedBy: string | null;
  updatedOn: Date | null;
  nextNudgeAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  /** Derived for API consumers; not stored. */
  displayStatus: RiskDisplayStatus;
  scoreBand: "low" | "medium" | "high";
};

export type CreateRiskInput = {
  title: string;
  description: string;
  type: RiskType;
  businessUnitId?: string;
  categoryId?: string;
  assetId?: string;
  ownerId?: string;
  likelihood: number;
  consequence: number;
  attachments?: Array<{
    fileName: string;
    mimeType?: string;
    sizeBytes?: number;
    storageKey?: string;
    url?: string;
  }>;
  source?: RiskSource;
};

export type UpdateRiskInput = {
  title?: string;
  description?: string;
  type?: RiskType;
  categoryId?: string | null;
  assetId?: string | null;
  ownerId?: string | null;
  likelihood?: number;
  consequence?: number;
  mitigationText?: string | null;
  acceptanceRationale?: string | null;
  decisionMaker?: string | null;
  /** Applied via general update path (UI journey). */
  mitigated?: boolean;
  accepted?: boolean;
  attachments?: Array<{
    fileName: string;
    mimeType?: string;
    sizeBytes?: number;
    storageKey?: string;
    url?: string;
  }>;
};

export type MitigateRiskInput = {
  mitigationText: string;
};

export type AcceptRiskInput = {
  acceptanceRationale: string;
  decisionMaker?: string;
};

export type ListRisksQuery = {
  page: number;
  pageSize: number;
  search?: string;
  status?: RiskDisplayStatus;
  businessUnitIds?: string[];
  ownerIds?: string[];
  categoryIds?: string[];
  types?: RiskType[];
  raisedFrom?: Date;
  raisedTo?: Date;
  sort?: "raisedOn" | "score" | "title" | "updatedAt";
  sortDir?: "asc" | "desc";
};

export type PaginatedRisks = {
  items: Risk[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type RiskStats = {
  total: number;
  open: number;
  escalated: number;
  mitigated: number;
  accepted: number;
  byScoreBand: { low: number; medium: number; high: number };
};

export type SetComplianceLinksInput = {
  links: ComplianceLink[];
};

export const RISKS_RESOURCE = "risks";

export const NUDGE_COOLDOWN_MS = 24 * 60 * 60 * 1000;
