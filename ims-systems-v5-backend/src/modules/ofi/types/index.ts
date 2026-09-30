/**
 * OFI (Opportunity for Improvement) domain types.
 * Spec: docs/module-specifications/ofi.md
 *
 * Technical/V4 module name is CIP; product term is OFI.
 */

export const OFI_IMPLEMENTATION_STATUSES = [
  "Pending",
  "In Progress",
  "Implemented",
] as const;
export type OfiImplementationStatus =
  (typeof OFI_IMPLEMENTATION_STATUSES)[number];

export type OfiDisplayStatus = OfiImplementationStatus;

export type OfiAttachment = {
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

export type OfiSource = {
  moduleType: string;
  moduleId: string;
};

export type OfiActivityEntry = {
  id: string;
  type: string;
  message: string;
  actorId: string | null;
  at: Date;
};

export type OfiImplemented = {
  status: OfiImplementationStatus;
  by: string | null;
  on: Date | null;
};

export type Ofi = {
  id: string;
  organizationId: string;
  reference: string;
  title: string;
  opportunityForImprovement: string;
  ownerId?: string;
  businessUnitId: string;
  cost?: number;
  implemented: OfiImplemented;
  attachments: OfiAttachment[];
  complianceLinks: ComplianceLink[];
  source?: OfiSource;
  activity: OfiActivityEntry[];
  createdBy: string;
  createdOn: Date;
  updatedBy: string | null;
  updatedOn: Date | null;
  nextNudgeAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  /** Derived; mirrors implemented.status. */
  displayStatus: OfiDisplayStatus;
};

export function deriveDisplayStatus(ofi: {
  implemented: { status: OfiImplementationStatus };
}): OfiDisplayStatus {
  return ofi.implemented.status;
}

export type AttachmentInput = {
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
  storageKey?: string;
  url?: string;
};

export type CreateOfiInput = {
  title: string;
  opportunityForImprovement: string;
  ownerId: string;
  businessUnitId: string;
  cost?: number;
  attachments?: AttachmentInput[];
  source?: OfiSource;
};

export type UpdateOfiInput = {
  title?: string;
  opportunityForImprovement?: string;
  ownerId?: string | null;
  cost?: number | null;
  attachments?: AttachmentInput[];
};

/**
 * Audit-promoted OFI — owner may be omitted (spec gap).
 * Prefer preserving the embedded finding id when it is a valid ObjectId.
 */
export type PromoteOfiFromAuditInput = {
  id?: string;
  title: string;
  opportunityForImprovement: string;
  businessUnitId: string;
  createdBy: string;
  auditId: string;
};

export type AddOfiActivityInput = {
  message: string;
};

export type ListOfisQuery = {
  page: number;
  pageSize: number;
  search?: string;
  status?: OfiDisplayStatus;
  businessUnitIds?: string[];
  ownerIds?: string[];
  sourceModuleType?: string;
  sourceModuleId?: string;
  sort?: "createdOn" | "title" | "updatedAt" | "reference";
  sortDir?: "asc" | "desc";
};

export type PaginatedOfis = {
  items: Ofi[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type OfiStats = {
  total: number;
  pending: number;
  inProgress: number;
  implemented: number;
};

export type SetComplianceLinksInput = {
  links: ComplianceLink[];
};

/** Authz resource type. */
export const OFI_RESOURCE = "ofi";

/** Task source module type (V4 CIP collection / moduleType). */
export const OFI_SOURCE_MODULE = "cips";

export const NUDGE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export const OFI_STATUS_OPTIONS: OfiDisplayStatus[] = [
  "Pending",
  "In Progress",
  "Implemented",
];
