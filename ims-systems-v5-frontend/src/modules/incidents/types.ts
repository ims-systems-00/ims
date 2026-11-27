/**
 * Incident Management frontend types — aligned with backend `/api/v1/incidents`.
 */

export const INCIDENT_PRIORITIES = ["P1", "P2", "P3", "P4"] as const;
export type IncidentPriority = (typeof INCIDENT_PRIORITIES)[number];

export const INCIDENT_PRIVACY = ["Organisational", "Business unit"] as const;
export type IncidentPrivacy = (typeof INCIDENT_PRIVACY)[number];

export type IncidentDisplayStatus = "Open" | "Escalated" | "Resolved";

export const INCIDENT_TYPES = [
  "Near miss",
  "Minor injury",
  "Major injury",
  "Dangerous occurrence",
  "Ill health",
  "Environmental",
  "Property damage",
  "Security",
  "Other",
] as const;
export type IncidentType = (typeof INCIDENT_TYPES)[number];

export const INVESTIGATION_STATUSES = ["not_started", "in_progress", "done"] as const;
export type InvestigationStatus = (typeof INVESTIGATION_STATUSES)[number];

export const INVESTIGATION_LABELS: Record<InvestigationStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  done: "Done",
};

export type IncidentInvestigation = {
  status: InvestigationStatus;
  startedOn: string | null;
  startedBy: string | null;
  completedOn: string | null;
  rootCause?: string;
};

export type LifecycleFlag = {
  status: boolean;
  by: string | null;
  on: string | null;
};

export type IncidentAttachment = {
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

export type IncidentSource = {
  moduleType: string;
  moduleId: string;
};

export type IncidentActivityEntry = {
  id: string;
  type: string;
  message: string;
  actorId: string | null;
  at: string;
};

export type Incident = {
  id: string;
  organizationId: string;
  reference: string;
  title: string;
  description: string;
  businessUnitId?: string;
  priority: IncidentPriority;
  ownerId?: string;
  methodOfNotification?: string;
  affectedService?: string;
  categoryId?: string;
  /** Live compliance (ISO 9.1 / 10.2). */
  incidentType?: IncidentType;
  occurredOn: string | null;
  area?: string;
  investigation: IncidentInvestigation;
  privacy: IncidentPrivacy;
  resolution?: string;
  resolved: LifecycleFlag;
  resolutionTimeMs: number | null;
  escalated: LifecycleFlag;
  attachments: IncidentAttachment[];
  complianceLinks: ComplianceLink[];
  source?: IncidentSource;
  activity: IncidentActivityEntry[];
  raisedBy: string;
  raisedOn: string;
  updatedBy: string | null;
  updatedOn: string | null;
  nextNudgeAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  displayStatus: IncidentDisplayStatus;
};

export type AttachmentInput = {
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
  storageKey?: string;
  url?: string;
};

export type CreateIncidentInput = {
  title: string;
  description: string;
  businessUnitId?: string;
  priority?: IncidentPriority;
  ownerId?: string;
  methodOfNotification?: string;
  affectedService?: string;
  categoryId?: string;
  incidentType?: IncidentType;
  occurredOn?: string;
  area?: string;
  privacy?: IncidentPrivacy;
  attachments?: AttachmentInput[];
  source?: IncidentSource;
};

export type UpdateIncidentInput = {
  title?: string;
  description?: string;
  ownerId?: string | null;
  priority?: IncidentPriority;
  methodOfNotification?: string | null;
  affectedService?: string | null;
  categoryId?: string | null;
  incidentType?: IncidentType | null;
  occurredOn?: string | null;
  area?: string | null;
  investigationStatus?: InvestigationStatus;
  rootCause?: string | null;
  privacy?: IncidentPrivacy;
  resolution?: string | null;
  resolved?: boolean;
  attachments?: AttachmentInput[];
};

export type ListIncidentsParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: IncidentDisplayStatus;
  businessUnitIds?: string[];
  ownerIds?: string[];
  priorities?: IncidentPriority[];
  raisedFrom?: string;
  raisedTo?: string;
  sourceModuleType?: string;
  sourceModuleId?: string;
  sort?: "raisedOn" | "priority" | "title" | "updatedAt";
  sortDir?: "asc" | "desc";
};

export type PaginatedIncidents = {
  items: Incident[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type IncidentStats = {
  total: number;
  open: number;
  escalated: number;
  resolved: number;
  byPriority: Record<IncidentPriority, number>;
};

export const INCIDENT_STATUS_OPTIONS: IncidentDisplayStatus[] = [
  "Open",
  "Escalated",
  "Resolved",
];

/** Module type used when linking tasks/evidence to an incident. */
export const INCIDENT_SOURCE_MODULE = "incidents";

export function formatResolutionTime(ms: number | null | undefined): string {
  if (ms == null || ms < 0) return "—";
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours <= 0) return `${minutes}m`;
  if (hours < 48) return `${hours}h ${minutes}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}
