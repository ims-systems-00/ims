import { Router } from "express";
import type { Authorizer } from "../../../security";
import {
  DevAllIncidentsListScopeAdapter,
  NoOpIncidentCalendarAdapter,
  NoOpIncidentNotificationAdapter,
  NoOpIncidentTaskAdapter,
  type IncidentCalendarPort,
  type IncidentListScopePort,
  type IncidentNotificationPort,
  type IncidentTaskPort,
} from "../ports";
import { createIncidentRepository } from "../repositories/incident.repository";
import {
  createIncidentService,
  type IncidentService,
} from "../services/incident.service";
import { createIncidentController } from "../controllers/incident.controller";

export type IncidentRouterDeps = {
  authorizer: Authorizer;
  notifications?: IncidentNotificationPort;
  calendar?: IncidentCalendarPort;
  tasks?: IncidentTaskPort;
  listScope?: IncidentListScopePort;
};

/**
 * Compose Incident service for route mounting and cross-module adapters.
 */
export function createIncidentModule(deps: IncidentRouterDeps): {
  service: IncidentService;
  router: Router;
} {
  const repository = createIncidentRepository();
  const service = createIncidentService({
    repository,
    authorizer: deps.authorizer,
    notifications:
      deps.notifications ?? new NoOpIncidentNotificationAdapter(),
    calendar: deps.calendar ?? new NoOpIncidentCalendarAdapter(),
    tasks: deps.tasks ?? new NoOpIncidentTaskAdapter(),
    listScope: deps.listScope ?? new DevAllIncidentsListScopeAdapter(),
  });
  const controller = createIncidentController(service);
  const router = Router();

  router.get("/", controller.list);
  router.get("/stats", controller.stats);
  router.get("/report", controller.report);
  router.post("/", controller.create);
  router.get("/:id", controller.getById);
  router.patch("/:id", controller.update);
  router.delete("/:id", controller.remove);
  router.post("/:id/resolve", controller.resolve);
  router.post("/:id/escalate", controller.escalate);
  router.post("/:id/nudge", controller.nudge);
  router.delete("/:id/attachments/:attachmentId", controller.removeAttachment);
  router.put("/:id/compliance-links", controller.setComplianceLinks);

  return { service, router };
}

/**
 * HTTP routes for Incident Management.
 * Mounted at /api/v1/incidents
 */
export function createIncidentRouter(deps: IncidentRouterDeps): Router {
  return createIncidentModule(deps).router;
}
