/**
 * Public surface for Customer Management (CRM).
 * Other modules may import only from this entry.
 */

export {
  createCustomerRouter,
  createCustomerModule,
} from "./routes/customer.routes";
export type { CustomerRouterDeps } from "./routes/customer.routes";
export { createCustomerService } from "./services/customer.service";
export type { CustomerService } from "./services/customer.service";
export { createCustomerRepository } from "./repositories/customer.repository";
export type {
  Customer,
  CreateCustomerInput,
  UpdateCustomerInput,
  ListCustomersQuery,
  PaginatedCustomers,
  CustomerOverview,
  AccountManagerOverview,
  CustomerStage,
  CustomerStatus,
} from "./types";
export {
  CUSTOMERS_RESOURCE,
  CUSTOMERS_SOURCE_MODULE,
  CUSTOMER_STAGES,
  CUSTOMER_STATUSES,
  CUSTOMER_PROBABILITIES,
  DEFAULT_CUSTOMER_LOGO_SRC,
} from "./types";
export {
  NoOpCustomerNotificationAdapter,
  NoOpCustomerTaskAdapter,
  NoOpCustomerInvoiceStatsAdapter,
  NoOpCustomerIncidentStatsAdapter,
  NoOpCustomerCampaignStatsAdapter,
  NoOpCustomerInteractionStatsAdapter,
  DevAllCustomersListScopeAdapter,
} from "./ports";
export type {
  CustomerNotificationPort,
  CustomerTaskPort,
  CustomerInvoiceStatsPort,
  CustomerIncidentStatsPort,
  CustomerCampaignStatsPort,
  CustomerInteractionStatsPort,
  CustomerListScopePort,
  CustomerListScope,
} from "./ports";
