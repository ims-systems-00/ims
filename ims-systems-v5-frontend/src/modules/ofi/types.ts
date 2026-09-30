/**
 * OFI frontend types — aligned with backend `/api/v1/ofi`.
 */

export const OFI_IMPLEMENTATION_STATUSES = [
  "Pending",
  "In Progress",
  "Implemented",
] as const;
export type OfiImplementationStatus =
  (typeof OFI_IMPLEMENTATION_STATUSES)[number];

export type OfiDisplayStatus = OfiImplementationStatus;

export type OfiImplemented = {
  status: OfiImplementationStatus;
  by: string | null;
  on: string | null;
};

export type OfiAttachment = {
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

export type OfiSource = {
  moduleType: string;
  moduleId: string;
};

export type OfiActivityEntry = {
  id: string;
  type: string;
  message: string;
  actorId: string | null;
  at: string;
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
  createdOn: string;
  updatedBy: string | null;
  updatedOn: string | null;
  nextNudgeAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  displayStatus: OfiDisplayStatus;
};

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
};

export type UpdateOfiInput = {
  title?: string;
  opportunityForImprovement?: string;
  ownerId?: string | null;
  cost?: number | null;
  attachments?: AttachmentInput[];
};

export type ListOfisParams = {
  page?: number;
  pageSize?: number;
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

export const OFI_STATUS_OPTIONS: OfiDisplayStatus[] = [
  "Pending",
  "In Progress",
  "Implemented",
];

/** Task source module type (backend constant). */
export const OFI_SOURCE_MODULE = "cips";
