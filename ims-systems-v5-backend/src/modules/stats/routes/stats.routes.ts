import { Router } from "express";
import type { Authorizer } from "../../../security";
import type { StatsModulePorts } from "../ports";
import {
  createStatsService,
  type StatsService,
} from "../services/stats.service";
import { createStatsController } from "../controllers/stats.controller";

export type StatsRouterDeps = {
  authorizer: Authorizer;
  ports: StatsModulePorts;
};

/**
 * Compose Stats live aggregation module.
 * Mounted at /api/v1/stats
 */
export function createStatsModule(deps: StatsRouterDeps): {
  service: StatsService;
  router: Router;
} {
  const service = createStatsService({
    authorizer: deps.authorizer,
    ports: deps.ports,
  });
  const controller = createStatsController(service);
  const router = Router();

  router.get("/global", controller.globalStats);
  router.get("/digital-maturity", controller.digitalMaturityStats);
  router.get("/compliance", controller.complianceStats);
  router.get("/audit", controller.auditStats);
  router.get("/risk", controller.riskStats);
  router.get("/incident", controller.incidentStats);
  router.get("/inventory", controller.inventoryStats);
  router.get("/supplier", controller.supplierStats);
  router.get("/cip", controller.cipStats);
  router.get("/crm", controller.crmStats);

  return { service, router };
}

export function createStatsRouter(deps: StatsRouterDeps): Router {
  return createStatsModule(deps).router;
}
