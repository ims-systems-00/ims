/**
 * Public surface for the KPI Objectives module.
 * Other modules may import only from this entry.
 *
 * Do not import the Mongoose model or repository from outside this module.
 * Supplier embedded KPI notes are a separate Supplier capability.
 */

export {
  createKpiObjectivesRouter,
  createKpiObjectivesModule,
} from "./routes/kpi-objectives.routes";
export type { KpiObjectivesRouterDeps } from "./routes/kpi-objectives.routes";
export { createKpiObjectivesService, computeProgressPercentage } from "./services/kpi-objectives.service";
export type {
  KpiObjectivesService,
  KpiObjectivesApplicationPort,
} from "./services/kpi-objectives.service";
export { createKpiObjectiveRepository } from "./repositories/kpi-objective.repository";
export {
  createKpiBusinessUnitAdapter,
  createKpiObjectiveNotificationAdapter,
} from "./adapters";
export {
  NoOpKpiObjectiveNotificationAdapter,
  AlwaysAllowKpiBusinessUnitAdapter,
  DevAllKpiObjectivesListScopeAdapter,
} from "./ports";
export type {
  KpiObjectiveNotificationPort,
  KpiObjectiveBusinessUnitPort,
  KpiObjectiveListScopePort,
  KpiObjectiveListScope,
} from "./ports";
export type {
  KpiObjective,
  KpiObjectiveStatement,
  CreateKpiObjectiveInput,
  UpdateKpiObjectiveInput,
  ListKpiObjectivesQuery,
  PaginatedKpiObjectives,
  KpiPrivacy,
  KpiModuleType,
} from "./types";
export {
  KPI_OBJECTIVES_RESOURCE,
  KPI_PRIVACY,
  KPI_MODULE_TYPES,
  MAX_KPI_VALUE_LENGTH,
  MAX_KPI_UNIT_LENGTH,
} from "./types";
