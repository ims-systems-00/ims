/**
 * Audit domain types.
 * Spec: docs/module-specifications/audit.md
 */

export const AUDIT_TYPES = ["Internal", "External"] as const;
export type AuditType = (typeof AUDIT_TYPES)[number];

export const AUDIT_INTERVALS = ["Quarterly", "Half yearly", "Yearly"] as const;
export type AuditInterval = (typeof AUDIT_INTERVALS)[number];

/**
 * Display status derived from completed.status.
 * Spec §6 / Terminology: Scheduled | Completed.
 */
export type AuditDisplayStatus = "Scheduled" | "Completed";

export function deriveDisplayStatus(audit: {
  completed: { status: boolean };
}): AuditDisplayStatus {
  return audit.completed.status ? "Completed" : "Scheduled";
}

export type LifecycleFlag = {
  status: boolean;
  by: string | null;
  on: Date | null;
};

export type AuditAttachment = {
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

/** Non-conformity finding (Identification). */
export type AuditIdentification = {
  id: string;
  nonConformity: string;
  rootCause: string;
};

/** Embedded risk recorded during the audit. */
export type AuditEmbeddedRisk = {
  id: string;
  title: string;
  description: string;
  likelihood: number;
  consequence: number;
  total: number;
};

/** Opportunity For Improvement (stored as CIP-shaped embedded record). */
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
  startDate: Date;
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
  createdOn: Date;
  updatedBy: string | null;
  updatedOn: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  /** Derived for API consumers; not stored. */
  displayStatus: AuditDisplayStatus;
};

export type AttachmentInput = {
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
  storageKey?: string;
  url?: string;
};

export type CreateAuditInput = {
  title: string;
  focusArea: string;
  auditorId: string;
  businessUnitId: string;
  complianceBodyId: string;
  startDate: Date;
  interval: AuditInterval;
  type: AuditType;
  time?: string;
  attachments?: AttachmentInput[];
};

export type UpdateAuditInput = {
  title?: string;
  focusArea?: string;
  businessUnitId?: string;
  complianceBodyId?: string;
  startDate?: Date;
  time?: string | null;
  comment?: string | null;
  attachments?: AttachmentInput[];
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

export type SetComplianceLinksInput = {
  links: ComplianceLink[];
};

export type ListAuditsQuery = {
  page: number;
  pageSize: number;
  search?: string;
  type?: AuditType;
  status?: AuditDisplayStatus;
  /** When true, only Scheduled audits with startDate >= now. */
  upcoming?: boolean;
  businessUnitIds?: string[];
  auditorIds?: string[];
  scheduleBefore?: Date;
  scheduleFrom?: Date;
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

export type AuditStats = {
  total: number;
  scheduled: number;
  completed: number;
  upcoming: number;
  byType: Record<AuditType, number>;
};

export const AUDITS_RESOURCE = "audits";

export const AUDIT_STATUS_OPTIONS: AuditDisplayStatus[] = [
  "Scheduled",
  "Completed",
];

/** Occurrences created per interval (spec §2 / V4 createAudit). */
export const INTERVAL_OCCURRENCES: Record<AuditInterval, number> = {
  Quarterly: 4,
  "Half yearly": 2,
  Yearly: 1,
};
