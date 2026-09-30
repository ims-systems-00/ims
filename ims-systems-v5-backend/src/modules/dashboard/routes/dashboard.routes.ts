import { Router } from "express";
import type { Authorizer } from "../../../security";
import type { DashboardModulePorts } from "../ports";
import {
  createDashboardService,
  type DashboardService,
} from "../services/dashboard.service";
import { createDashboardController } from "../controllers/dashboard.controller";

export type DashboardRouterDeps = {
  authorizer: Authorizer;
  ports: DashboardModulePorts;
};

/**
 * Compose Dashboard live aggregation module.
 * Mounted at /api/v1/dashboard
 */
export function createDashboardModule(deps: DashboardRouterDeps): {
  service: DashboardService;
  router: Router;
} {
  const service = createDashboardService({
    authorizer: deps.authorizer,
    ports: deps.ports,
  });
  const controller = createDashboardController(service);
  const router = Router();

  router.get("/organisation", controller.getOrganisation);
  router.get("/functional-units/:id", controller.getFunctionalUnit);

  return { service, router };
}

export function createDashboardRouter(deps: DashboardRouterDeps): Router {
  return createDashboardModule(deps).router;
}
