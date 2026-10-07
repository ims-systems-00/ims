/**
 * Risk Management frontend types — aligned with backend `/api/v1/risks`.
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

export const ASSET_LINKABLE_RISK_TYPES: RiskType[] = [
  "Hardware",
  "Software",
  "People",
  "Premise",
];

export function isAssetLinkableRiskType(type: RiskType): boolean {
  return (ASSET_LINKABLE_RISK_TYPES as readonly string[]).includes(type);
}

export type RiskDisplayStatus =
  | "Open"
  | "Escalated"
  | "Mitigated"
  | "Accepted";

export type RiskScoreBand = "low" | "medium" | "high";

export type RiskScorePair = {
  likelihood: number;
  consequence: number;
  total: number;
};

export type LifecycleFlag = {
  status: boolean;
  by: string | null;
  on: string | null;
};

export type RiskAttachment = {
  id: string;
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
  storageKey?: string;
  url?: string;
  uploadedBy: string;
  uploadedAt: string;
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
  at: string;
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
  raisedOn: string;
  updatedBy: string | null;
  updatedOn: string | null;
  nextNudgeAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  displayStatus: RiskDisplayStatus;
  scoreBand: RiskScoreBand;
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
  mitigated?: boolean;
  accepted?: boolean;
};

export type ListRisksParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: RiskDisplayStatus;
  businessUnitIds?: string[];
  ownerIds?: string[];
  categoryIds?: string[];
  types?: RiskType[];
  raisedFrom?: string;
  raisedTo?: string;
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

export const RISK_STATUS_OPTIONS: RiskDisplayStatus[] = [
  "Open",
  "Escalated",
  "Mitigated",
  "Accepted",
];

export function scoreBandLabel(band: RiskScoreBand): string {
  switch (band) {
    case "low":
      return "Low";
    case "medium":
      return "Medium";
    case "high":
      return "High";
  }
}

/** Tasks sourced from a risk use this moduleType on `source`. */
export const RISK_SOURCE_MODULE = "risks";

export type SetComplianceLinksInput = {
  links: ComplianceLink[];
};
