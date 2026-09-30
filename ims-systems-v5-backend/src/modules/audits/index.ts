/**
 * Public surface for the Audit module.
 * Other modules may import only from this entry.
 */

export { createAuditRouter, createAuditModule } from "./routes/audit.routes";
export type { AuditRouterDeps } from "./routes/audit.routes";
export { createAuditService, buildScheduleDates } from "./services/audit.service";
export type { AuditService } from "./services/audit.service";
export { createAuditRepository } from "./repositories/audit.repository";
export type {
  Audit,
  CreateAuditInput,
  UpdateAuditInput,
  ListAuditsQuery,
  PaginatedAudits,
  AuditStats,
  AuditType,
  AuditInterval,
  AuditDisplayStatus,
} from "./types";
export {
  AUDIT_TYPES,
  AUDIT_INTERVALS,
  AUDITS_RESOURCE,
  AUDIT_STATUS_OPTIONS,
  INTERVAL_OCCURRENCES,
  deriveDisplayStatus,
} from "./types";
export {
  NoOpAuditNotificationAdapter,
  NoOpAuditCalendarAdapter,
  NoOpAuditTaskAdapter,
  NoOpAuditReportAdapter,
  NoOpAuditIncidentPromotionAdapter,
  NoOpAuditRiskPromotionAdapter,
  NoOpAuditCipPromotionAdapter,
  DevAllAuditsListScopeAdapter,
} from "./ports";
export type {
  AuditNotificationPort,
  AuditCalendarPort,
  AuditTaskPort,
  AuditReportPort,
  AuditIncidentPromotionPort,
  AuditRiskPromotionPort,
  AuditCipPromotionPort,
  AuditListScopePort,
  AuditListScope,
  PromoteNonConformityInput,
  PromoteEmbeddedRiskInput,
  PromoteOfiInput,
} from "./ports";
