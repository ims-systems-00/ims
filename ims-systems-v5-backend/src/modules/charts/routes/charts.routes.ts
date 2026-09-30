import { Router } from "express";
import type { Authorizer } from "../../../security";
import { createChartRepository } from "../repositories/chart.repository";
import {
  createChartsService,
  type ChartsApplicationPort,
  type ChartsService,
} from "../services/charts.service";
import { createChartsController } from "../controllers/charts.controller";

export type ChartsRouterDeps = {
  authorizer: Authorizer;
};

/**
 * Compose Charts definition-registry module.
 * Mounted at /api/v1/charts
 *
 * No execute endpoint — stored derivations are recipes only.
 */
export function createChartsModule(deps: ChartsRouterDeps): {
  service: ChartsService;
  application: ChartsApplicationPort;
  router: Router;
} {
  const repository = createChartRepository();
  const service = createChartsService({
    repository,
    authorizer: deps.authorizer,
  });
  const controller = createChartsController(service);
  const router = Router();

  router.get("/", controller.list);
  router.post("/", controller.create);
  router.get("/:id", controller.getById);
  router.patch("/:id", controller.update);
  router.delete("/:id", controller.remove);

  return {
    service,
    application: {
      getById: (organizationId, id) =>
        service.getByIdForOrganization(organizationId, id),
      listByOrganization: (organizationId, query) =>
        service.listForOrganization(organizationId, query),
    },
    router,
  };
}

export function createChartsRouter(deps: ChartsRouterDeps): Router {
  return createChartsModule(deps).router;
}
