/**
 * Public surface for the Stats module.
 * Other modules may import only from this entry.
 *
 * Live organisational analytics — no persisted Stats collection.
 * Spec: docs/module-specifications/stats.md
 */

export {
  createStatsRouter,
  createStatsModule,
} from "./routes/stats.routes";
export type { StatsRouterDeps } from "./routes/stats.routes";
export { createStatsService } from "./services/stats.service";
export type { StatsService } from "./services/stats.service";
export { createStatsPortsFromModules } from "./adapters/module-ports.adapter";
export type { StatsPortsFromModulesInput } from "./adapters/module-ports.adapter";
export {
  DevZeroStatsPorts,
  DevNoOrgTargetsAdapter,
  UnavailableComplianceAdapter,
  UnavailableInvoicesAdapter,
} from "./ports";
export type {
  StatsModulePorts,
  StatsRisksPort,
  StatsIncidentsPort,
  StatsAuditsPort,
  StatsOfiPort,
  StatsSuppliersPort,
  StatsInventoryPort,
  StatsManagementReviewsPort,
  StatsFunctionalUnitsPort,
  StatsUsersPort,
  StatsCustomersPort,
  StatsInvoicesPort,
  StatsCompliancePort,
  StatsOrganisationPort,
} from "./ports";
export type {
  GlobalStats,
  DigitalMaturityStats,
  ComplianceStats,
  AuditStatsResult,
  RiskStatsResult,
  IncidentStatsResult,
  InventoryStatsResult,
  SupplierStatsResult,
  CipStatsResult,
  CrmStatsResult,
  StatsDateQuery,
  StatsRiskQuery,
  OrganisationalState,
} from "./types";
export {
  STATS_RESOURCE,
  ORGANISATIONAL_STATES,
  RISK_TYPE_LABELS,
} from "./types";
export {
  deriveOrganisationalConfidence,
  deriveOrganisationalState,
  maturityScoreFromUtilisation,
  supplierRiskLevel,
} from "./services/calculations";
