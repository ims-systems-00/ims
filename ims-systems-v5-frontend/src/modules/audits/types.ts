/**
 * Audit frontend types — aligned with backend `/api/v1/audits`.
 */

export const AUDIT_TYPES = ["Internal", "External"] as const;
export type AuditType = (typeof AUDIT_TYPES)[number];

export const AUDIT_INTERVALS = ["Quarterly", "Half yearly", "Yearly"] as const;
export type AuditInterval = (typeof AUDIT_INTERVALS)[number];

export type AuditDisplayStatus = "Scheduled" | "Completed";

export type LifecycleFlag = {
  status: boolean;
  by: string | null;
  on: string | null;
};

export type AuditAttachment = {
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

export type AuditIdentification = {
  id: string;
  nonConformity: string;
  rootCause: string;
};

export type AuditEmbeddedRisk = {
  id: string;
  title: string;
  description: string;
  likelihood: number;
  consequence: number;
  total: number;
};

export type AuditOfi = {
  id: string;
  title: string;
  opportunityForImprovement: string;
};

export type Audit = {
  id: string;
  organizationId: string;
  reference: string;
  title: string;
  type: AuditType;
  focusArea: string;
  businessUnitId: string;
  complianceBodyId: string;
  auditorId: string;
  startDate: string;
  time?: string;
  interval: AuditInterval;
  comment?: string;
  identifications: AuditIdentification[];
  risks: AuditEmbeddedRisk[];
  ofis: AuditOfi[];
  attachments: AuditAttachment[];
  complianceLinks: ComplianceLink[];
  completed: LifecycleFlag;
  createdBy: string;
  createdOn: string;
  updatedBy: string | null;
  updatedOn: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  displayStatus: AuditDisplayStatus;
};

export type CreateAuditInput = {
  title: string;
  focusArea: string;
  auditorId: string;
  businessUnitId: string;
  complianceBodyId: string;
  startDate: string;
  interval: AuditInterval;
  type: AuditType;
  time?: string;
};

export type UpdateAuditInput = {
  title?: string;
  focusArea?: string;
  businessUnitId?: string;
  complianceBodyId?: string;
  startDate?: string;
  time?: string | null;
  comment?: string | null;
};

export type CreateIdentificationInput = {
  nonConformity: string;
  rootCause: string;
};

export type UpdateIdentificationInput = {
  nonConformity?: string;
  rootCause?: string;
};

export type CreateEmbeddedRiskInput = {
  title: string;
  description: string;
  likelihood: number;
  consequence: number;
};

export type UpdateEmbeddedRiskInput = {
  title?: string;
  description?: string;
  likelihood?: number;
  consequence?: number;
};

export type CreateOfiInput = {
  title: string;
  opportunityForImprovement: string;
};

export type UpdateOfiInput = {
  title?: string;
  opportunityForImprovement?: string;
};

export type ExtractReportInput = {
  recipientName: string;
  recipientEmail: string;
};

export type ListAuditsParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: AuditType;
  status?: AuditDisplayStatus;
  upcoming?: boolean;
  businessUnitIds?: string[];
  auditorIds?: string[];
  scheduleBefore?: string;
  scheduleFrom?: string;
  sort?: "startDate" | "title" | "updatedAt" | "reference";
  sortDir?: "asc" | "desc";
};

export type PaginatedAudits = {
  items: Audit[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type CreateAuditsResult = {
  items: Audit[];
};

export type AuditStats = {
  total: number;
  scheduled: number;
  completed: number;
  upcoming: number;
  byType: Record<AuditType, number>;
};

export const AUDIT_STATUS_OPTIONS: AuditDisplayStatus[] = [
  "Scheduled",
  "Completed",
];
