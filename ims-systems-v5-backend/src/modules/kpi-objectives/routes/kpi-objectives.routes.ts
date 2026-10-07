import { Router } from "express";
import type { Authorizer } from "../../../security";
import {
  AlwaysAllowKpiBusinessUnitAdapter,
  DevAllKpiObjectivesListScopeAdapter,
  NoOpKpiObjectiveNotificationAdapter,
  type KpiObjectiveBusinessUnitPort,
  type KpiObjectiveListScopePort,
  type KpiObjectiveNotificationPort,
} from "../ports";
import { createKpiObjectiveRepository } from "../repositories/kpi-objective.repository";
import {
  createKpiObjectivesService,
  type KpiObjectivesApplicationPort,
  type KpiObjectivesService,
} from "../services/kpi-objectives.service";
import { createKpiObjectivesController } from "../controllers/kpi-objectives.controller";

export type KpiObjectivesRouterDeps = {
  authorizer: Authorizer;
  notifications?: KpiObjectiveNotificationPort;
  businessUnits?: KpiObjectiveBusinessUnitPort;
  listScope?: KpiObjectiveListScopePort;
};

/**
 * Compose KPI Objectives module.
 * Mounted at /api/v1/kpi-objectives
 */
export function createKpiObjectivesModule(deps: KpiObjectivesRouterDeps): {
  service: KpiObjectivesService;
  application: KpiObjectivesApplicationPort;
  router: Router;
} {
  const repository = createKpiObjectiveRepository();
  const service = createKpiObjectivesService({
    repository,
    authorizer: deps.authorizer,
    notifications:
      deps.notifications ?? new NoOpKpiObjectiveNotificationAdapter(),
    businessUnits:
      deps.businessUnits ?? new AlwaysAllowKpiBusinessUnitAdapter(),
    listScope: deps.listScope ?? new DevAllKpiObjectivesListScopeAdapter(),
  });
  const controller = createKpiObjectivesController(service);
  const router = Router();

  router.get("/", controller.list);
  router.post("/", controller.create);
  router.get("/:id", controller.getById);
  router.patch("/:id", controller.update);
  router.delete("/:id", controller.remove);

  return {
    service,
    application: {
      listOrganisationalStatements: (organizationId) =>
        service.listOrganisationalStatements(organizationId),
      listBusinessUnitStatements: (organizationId, businessUnitId) =>
        service.listBusinessUnitStatements(organizationId, businessUnitId),
      getById: (organizationId, id) =>
        service.getByIdForOrganization(organizationId, id),
    },
    router,
  };
}

export function createKpiObjectivesRouter(
  deps: KpiObjectivesRouterDeps
): Router {
  return createKpiObjectivesModule(deps).router;
}
