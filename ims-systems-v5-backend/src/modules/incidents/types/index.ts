/**
 * Incident Management domain types.
 * Spec: docs/module-specifications/incident.md
 */

export const INCIDENT_PRIORITIES = ["P1", "P2", "P3", "P4"] as const;
export type IncidentPriority = (typeof INCIDENT_PRIORITIES)[number];

export const INCIDENT_PRIVACY = ["Organisational", "Business unit"] as const;
export type IncidentPrivacy = (typeof INCIDENT_PRIVACY)[number];

/**
 * Display status derived from resolved / escalated flags.
 * Spec §6: Open | Escalated | Resolved (no separate status field).
 */
export type IncidentDisplayStatus = "Open" | "Escalated" | "Resolved";

export function deriveDisplayStatus(incident: {
  resolved: { status: boolean };
  escalated: { status: boolean };
}): IncidentDisplayStatus {
  if (incident.resolved.status) return "Resolved";
  if (incident.escalated.status) return "Escalated";
  return "Open";
}

export type LifecycleFlag = {
  status: boolean;
  by: string | null;
  on: Date | null;
};

export type IncidentAttachment = {
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

export type IncidentSource = {
  moduleType: string;
  moduleId: string;
};

export type IncidentActivityEntry = {
  id: string;
  type: string;
  message: string;
  actorId: string | null;
  at: Date;
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
  raisedOn: Date;
  updatedBy: string | null;
  updatedOn: Date | null;
  nextNudgeAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  /** Derived for API consumers; not stored. */
  displayStatus: IncidentDisplayStatus;
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
  privacy?: IncidentPrivacy;
  attachments?: Array<{
    fileName: string;
    mimeType?: string;
    sizeBytes?: number;
    storageKey?: string;
    url?: string;
  }>;
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
  privacy?: IncidentPrivacy;
  resolution?: string | null;
  /** Applied via general update path (UI journey). */
  resolved?: boolean;
  attachments?: Array<{
    fileName: string;
    mimeType?: string;
    sizeBytes?: number;
    storageKey?: string;
    url?: string;
  }>;
};

export type ResolveIncidentInput = {
  resolution: string;
};

export type ListIncidentsQuery = {
  page: number;
  pageSize: number;
  search?: string;
  status?: IncidentDisplayStatus;
  businessUnitIds?: string[];
  ownerIds?: string[];
  priorities?: IncidentPriority[];
  raisedFrom?: Date;
  raisedTo?: Date;
  /** When omitted, main register lists standalone incidents only. */
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

export type SetComplianceLinksInput = {
  links: ComplianceLink[];
};

export const INCIDENTS_RESOURCE = "incidents";

export const NUDGE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export const INCIDENT_STATUS_OPTIONS: IncidentDisplayStatus[] = [
  "Open",
  "Escalated",
  "Resolved",
];

/** Module type used for standalone incidents in the main register. */
export const STANDALONE_SOURCE_MODULE = "incidents";
