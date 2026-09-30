/**
 * Public surface for the Functional Units module.
 * Other modules may import only from this entry.
 */

export { createFunctionalUnitRouter, createFunctionalUnitModule } from "./routes/functional-unit.routes";
export type { FunctionalUnitRouterDeps } from "./routes/functional-unit.routes";
export { createFunctionalUnitService } from "./services/functional-unit.service";
export type { FunctionalUnitService } from "./services/functional-unit.service";
export { createFunctionalUnitRepository } from "./repositories/functional-unit.repository";
export type {
  AccessType,
  FunctionalUnit,
  CreateFunctionalUnitInput,
  UpdateFunctionalUnitInput,
  ListFunctionalUnitsQuery,
  PaginatedFunctionalUnits,
} from "./types";
export {
  ACCESS_TYPES,
  BUSINESS_ACCESS_TYPES,
  COMPLIANCE_ACCESS_TYPES,
  isBusinessAccessType,
  isComplianceAccessType,
} from "./types";
export {
  AlwaysAllowGroupLicenceAdapter,
  NoOpDashboardInitAdapter,
  UnavailableInvitationAdapter,
  InsufficientGroupLicenceError,
} from "./ports";
export type {
  GroupLicencePort,
  DashboardInitPort,
  InvitationPort,
} from "./ports";
