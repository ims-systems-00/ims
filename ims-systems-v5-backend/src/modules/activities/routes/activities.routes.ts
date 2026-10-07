import { Router } from "express";
import type { Authorizer } from "../../../security";
import {
  DevAllActivitiesListScopeAdapter,
  NoOpActivityOfiFollowUpAdapter,
  type ActivityListScopePort,
  type ActivityOfiFollowUpPort,
} from "../ports";
import { createActivityRepository } from "../repositories/activity.repository";
import {
  createActivitiesService,
  type ActivitiesApplicationPort,
  type ActivitiesService,
} from "../services/activities.service";
import { createActivitiesController } from "../controllers/activities.controller";

export type ActivitiesRouterDeps = {
  authorizer: Authorizer;
  ofiFollowUp?: ActivityOfiFollowUpPort;
  listScope?: ActivityListScopePort;
};

/**
 * Compose Activities module.
 * Mounted at /api/v1/activities
 */
export function createActivitiesModule(deps: ActivitiesRouterDeps): {
  service: ActivitiesService;
  application: ActivitiesApplicationPort;
  router: Router;
} {
  const repository = createActivityRepository();
  const service = createActivitiesService({
    repository,
    authorizer: deps.authorizer,
    ofiFollowUp: deps.ofiFollowUp ?? new NoOpActivityOfiFollowUpAdapter(),
    listScope: deps.listScope ?? new DevAllActivitiesListScopeAdapter(),
  });
  const controller = createActivitiesController(service);
  const router = Router();

  router.get("/", controller.list);
  router.post("/", controller.create);
  router.get("/:id", controller.getById);
  router.patch("/:id", controller.update);
  router.delete("/:id", controller.remove);

  return {
    service,
    application: {
      recordAutomated: (organizationId, input) =>
        service.recordAutomatedForOrganization(organizationId, input),
      listForParent: (organizationId, query) =>
        service.listForOrganization(organizationId, query),
      getById: (organizationId, id) =>
        service.getByIdForOrganization(organizationId, id),
    },
    router,
  };
}

export function createActivitiesRouter(deps: ActivitiesRouterDeps): Router {
  return createActivitiesModule(deps).router;
}
