/**
 * Public surface for the Incident Management module.
 * Other modules may import only from this entry.
 */

export {
  createIncidentRouter,
  createIncidentModule,
} from "./routes/incident.routes";
export type { IncidentRouterDeps } from "./routes/incident.routes";
export { createIncidentService } from "./services/incident.service";
export type { IncidentService } from "./services/incident.service";
export { createIncidentRepository } from "./repositories/incident.repository";
export type {
  Incident,
  CreateIncidentInput,
  UpdateIncidentInput,
  ListIncidentsQuery,
  PaginatedIncidents,
  IncidentStats,
  IncidentPriority,
  IncidentDisplayStatus,
  IncidentPrivacy,
} from "./types";
export {
  INCIDENT_PRIORITIES,
  INCIDENT_PRIVACY,
  INCIDENTS_RESOURCE,
  INCIDENT_STATUS_OPTIONS,
  STANDALONE_SOURCE_MODULE,
  deriveDisplayStatus,
} from "./types";
export { createIncidentNotificationAdapter } from "./adapters/notification.adapter";
export {
  NoOpIncidentNotificationAdapter,
  NoOpIncidentCalendarAdapter,
  NoOpIncidentTaskAdapter,
  NoOpIncidentComplianceLinkAdapter,
  DevAllIncidentsListScopeAdapter,
} from "./ports";
export type {
  IncidentNotificationPort,
  IncidentCalendarPort,
  IncidentTaskPort,
  IncidentComplianceLinkPort,
  IncidentListScopePort,
  IncidentListScope,
} from "./ports";
