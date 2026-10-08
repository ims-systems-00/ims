/**
 * Public surface for the Supplier Management module.
 * Other modules may import only from this entry.
 */

export {
  createSupplierRouter,
  createSupplierModule,
} from "./routes/supplier.routes";
export type { SupplierRouterDeps } from "./routes/supplier.routes";
export { createSupplierService } from "./services/supplier.service";
export type { SupplierService } from "./services/supplier.service";
export { createSupplierRepository } from "./repositories/supplier.repository";
export type {
  Supplier,
  CreateSupplierInput,
  UpdateSupplierInput,
  ListSuppliersQuery,
  PaginatedSuppliers,
  SupplierStats,
  SupplierComplianceRiskLevel,
} from "./types";
export {
  SUPPLIERS_RESOURCE,
  SUPPLIERS_SOURCE_MODULE,
  SUPPLIER_COMPLIANCE_RISK_LEVELS,
  deriveIsCompliant,
  deriveComplianceRiskLevel,
} from "./types";
export { createSupplierNotificationAdapter } from "./adapters/notification.adapter";
export {
  NoOpSupplierNotificationAdapter,
  NoOpSupplierTaskAdapter,
  NoOpSupplierCalendarAdapter,
  NoOpSupplierIncidentStatsAdapter,
  DevAllSuppliersListScopeAdapter,
} from "./ports";
export type {
  SupplierNotificationPort,
  SupplierTaskPort,
  SupplierCalendarPort,
  SupplierIncidentStatsPort,
  SupplierListScopePort,
  SupplierListScope,
} from "./ports";
