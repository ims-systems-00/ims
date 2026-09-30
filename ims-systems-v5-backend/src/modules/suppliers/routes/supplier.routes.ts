import { Router } from "express";
import type { Authorizer } from "../../../security";
import {
  DevAllSuppliersListScopeAdapter,
  NoOpSupplierCalendarAdapter,
  NoOpSupplierIncidentStatsAdapter,
  NoOpSupplierNotificationAdapter,
  NoOpSupplierTaskAdapter,
  type SupplierCalendarPort,
  type SupplierIncidentStatsPort,
  type SupplierListScopePort,
  type SupplierNotificationPort,
  type SupplierTaskPort,
} from "../ports";
import { createSupplierRepository } from "../repositories/supplier.repository";
import {
  createSupplierService,
  type SupplierService,
} from "../services/supplier.service";
import { createSupplierController } from "../controllers/supplier.controller";

export type SupplierRouterDeps = {
  authorizer: Authorizer;
  notifications?: SupplierNotificationPort;
  tasks?: SupplierTaskPort;
  calendar?: SupplierCalendarPort;
  incidentStats?: SupplierIncidentStatsPort;
  listScope?: SupplierListScopePort;
};

/**
 * Compose Supplier service for route mounting and cross-module adapters.
 */
export function createSupplierModule(deps: SupplierRouterDeps): {
  service: SupplierService;
  router: Router;
} {
  const repository = createSupplierRepository();
  const service = createSupplierService({
    repository,
    authorizer: deps.authorizer,
    notifications:
      deps.notifications ?? new NoOpSupplierNotificationAdapter(),
    tasks: deps.tasks ?? new NoOpSupplierTaskAdapter(),
    calendar: deps.calendar ?? new NoOpSupplierCalendarAdapter(),
    incidentStats:
      deps.incidentStats ?? new NoOpSupplierIncidentStatsAdapter(),
    listScope: deps.listScope ?? new DevAllSuppliersListScopeAdapter(),
  });
  const controller = createSupplierController(service);
  const router = Router();

  router.get("/", controller.list);
  router.get("/stats", controller.stats);
  router.post("/", controller.create);
  router.get("/:id", controller.getById);
  router.patch("/:id", controller.update);
  router.delete("/:id", controller.remove);

  router.post("/:id/slas", controller.addSlaFiles);
  router.delete("/:id/slas/:fileId", controller.removeSlaFile);
  router.post("/:id/contracts", controller.addContractFiles);
  router.delete("/:id/contracts/:fileId", controller.removeContractFile);
  router.post("/:id/onboarding-files", controller.addOnboardingFiles);
  router.delete(
    "/:id/onboarding-files/:fileId",
    controller.removeOnboardingFile
  );
  router.post("/:id/kpi-objectives", controller.addKpiObjective);
  router.delete(
    "/:id/kpi-objectives/:kpiId",
    controller.removeKpiObjective
  );

  return { service, router };
}

/**
 * HTTP routes for Supplier Management.
 * Mounted at /api/v1/suppliers
 */
export function createSupplierRouter(deps: SupplierRouterDeps): Router {
  return createSupplierModule(deps).router;
}
