/**
 * Public surface for the OFI (Opportunity for Improvement) module.
 * Other modules may import only from this entry.
 *
 * Technical/V4 name: CIP (Continual Improvement Plan).
 */

export { createOfiRouter, createOfiModule } from "./routes/ofi.routes";
export type { OfiRouterDeps } from "./routes/ofi.routes";
export { createOfiService } from "./services/ofi.service";
export type { OfiService } from "./services/ofi.service";
export { createOfiRepository } from "./repositories/ofi.repository";
export type {
  Ofi,
  CreateOfiInput,
  UpdateOfiInput,
  ListOfisQuery,
  PaginatedOfis,
  OfiStats,
  OfiDisplayStatus,
  OfiImplementationStatus,
  PromoteOfiFromAuditInput,
} from "./types";
export {
  OFI_IMPLEMENTATION_STATUSES,
  OFI_RESOURCE,
  OFI_SOURCE_MODULE,
  OFI_STATUS_OPTIONS,
  NUDGE_COOLDOWN_MS,
  deriveDisplayStatus,
} from "./types";
export {
  NoOpOfiNotificationAdapter,
  NoOpOfiTaskAdapter,
  DevAllOfisListScopeAdapter,
} from "./ports";
export type {
  OfiNotificationPort,
  OfiTaskPort,
  OfiListScopePort,
  OfiListScope,
} from "./ports";
