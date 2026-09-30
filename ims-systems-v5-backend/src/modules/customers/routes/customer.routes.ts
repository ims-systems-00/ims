import { Router } from "express";
import type { Authorizer } from "../../../security";
import {
  DevAllCustomersListScopeAdapter,
  NoOpCustomerCampaignStatsAdapter,
  NoOpCustomerIncidentStatsAdapter,
  NoOpCustomerInteractionStatsAdapter,
  NoOpCustomerInvoiceStatsAdapter,
  NoOpCustomerNotificationAdapter,
  NoOpCustomerTaskAdapter,
  type CustomerCampaignStatsPort,
  type CustomerIncidentStatsPort,
  type CustomerInteractionStatsPort,
  type CustomerInvoiceStatsPort,
  type CustomerListScopePort,
  type CustomerNotificationPort,
  type CustomerTaskPort,
} from "../ports";
import { createCustomerRepository } from "../repositories/customer.repository";
import {
  createCustomerService,
  type CustomerService,
} from "../services/customer.service";
import { createCustomerController } from "../controllers/customer.controller";

export type CustomerRouterDeps = {
  authorizer: Authorizer;
  notifications?: CustomerNotificationPort;
  tasks?: CustomerTaskPort;
  invoices?: CustomerInvoiceStatsPort;
  incidents?: CustomerIncidentStatsPort;
  campaigns?: CustomerCampaignStatsPort;
  interactions?: CustomerInteractionStatsPort;
  listScope?: CustomerListScopePort;
};

/**
 * Compose Customer (CRM) service for route mounting and cross-module adapters.
 */
export function createCustomerModule(deps: CustomerRouterDeps): {
  service: CustomerService;
  router: Router;
} {
  const repository = createCustomerRepository();
  const service = createCustomerService({
    repository,
    authorizer: deps.authorizer,
    notifications:
      deps.notifications ?? new NoOpCustomerNotificationAdapter(),
    tasks: deps.tasks ?? new NoOpCustomerTaskAdapter(),
    invoices: deps.invoices ?? new NoOpCustomerInvoiceStatsAdapter(),
    incidents: deps.incidents ?? new NoOpCustomerIncidentStatsAdapter(),
    campaigns: deps.campaigns ?? new NoOpCustomerCampaignStatsAdapter(),
    interactions:
      deps.interactions ?? new NoOpCustomerInteractionStatsAdapter(),
    listScope: deps.listScope ?? new DevAllCustomersListScopeAdapter(),
  });
  const controller = createCustomerController(service);
  const router = Router();

  router.get("/", controller.list);
  router.post("/", controller.create);
  // Static analytics path must be registered before /:id
  router.get(
    "/analytics/manager-overview/:managerId",
    controller.managerOverview
  );
  router.get("/:id/overviews", controller.overview);
  router.get("/:id", controller.getById);
  router.patch("/:id", controller.update);
  router.delete("/:id", controller.remove);
  router.delete("/:id/attachments/:attachmentId", controller.removeAttachment);

  return { service, router };
}

/**
 * HTTP routes for Customer Management (CRM).
 * Mounted at /api/v1/customers
 */
export function createCustomerRouter(deps: CustomerRouterDeps): Router {
  return createCustomerModule(deps).router;
}
