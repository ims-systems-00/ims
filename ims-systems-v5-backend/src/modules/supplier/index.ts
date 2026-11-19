/**
 * Supplier & Contractor ASL module public surface.
 * Distinct from modules/suppliers (legacy contract register).
 */

export { createAslSupplierModule } from "./routes/asl-supplier.routes";
export type { AslSupplierRouterDeps } from "./routes/asl-supplier.routes";
export { createAslSupplierService } from "./services/asl-supplier.service";
export type { AslSupplierService } from "./services/asl-supplier.service";
export {
  createAslChaseService,
  startAslChaseSchedule,
} from "./services/asl-chase.service";
export type { AslChaseService } from "./services/asl-chase.service";
export {
  createAslEmailAdapter,
  createAslFilesAdapter,
  createAslIncidentAdapter,
  createAslNotificationAdapter,
  createAslOrgAdapter,
  createAslTaskAdapter,
} from "./adapters";
export {
  ASL_SUPPLIERS_RESOURCE,
  ASL_SOURCE_MODULE,
  DEFAULT_ASL_CRITERIA,
  DEFAULT_ASL_INTERVAL,
} from "./types";
export type {
  AslSupplier,
  AslSettings,
  AslOverview,
  AslNotifyResult,
} from "./types";
export {
  applyStandingRules,
  weightedScore,
  requiredDocs,
  docState,
  collectIssues,
  validateCriteriaWeights,
} from "./lib/asl-rules";
