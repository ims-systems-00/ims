/**
 * Public surface for the Dashboard module.
 * Other modules may import only from this entry.
 *
 * V5 Phase 1: live read/aggregation — no persisted Dashboard collection.
 */

export {
  createDashboardRouter,
  createDashboardModule,
} from "./routes/dashboard.routes";
export type { DashboardRouterDeps } from "./routes/dashboard.routes";
export { createDashboardService } from "./services/dashboard.service";
export type { DashboardService } from "./services/dashboard.service";
export {
  deriveOrganisationalConfidence,
  deriveOrganisationalState,
  buildHeadline,
} from "./services/headline";
export { createDashboardPortsFromModules } from "./adapters/module-ports.adapter";
export type { DashboardPortsFromModulesInput } from "./adapters/module-ports.adapter";
export { createLiveDashboardInitAdapter } from "./adapters/dashboard-init.adapter";
export { DevZeroDashboardPorts } from "./ports";
export type {
  DashboardModulePorts,
  DashboardRisksPort,
  DashboardIncidentsPort,
  DashboardAuditsPort,
  DashboardOfiPort,
  DashboardSuppliersPort,
  DashboardInventoryPort,
  DashboardManagementReviewsPort,
  DashboardFunctionalUnitsPort,
  DashboardUsersPort,
  DashboardPremisesPort,
  DashboardTasksPort,
} from "./ports";
export type {
  LiveDashboard,
  LiveDashboardQuery,
  DashboardHeadline,
  DashboardCounts,
  DashboardModuleStats,
  DashboardContext,
  OrganisationalState,
} from "./types";
export {
  DASHBOARD_RESOURCE,
  ORGANISATIONAL_STATES,
} from "./types";
