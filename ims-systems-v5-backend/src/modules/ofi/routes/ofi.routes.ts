import { Router } from "express";
import type { Authorizer } from "../../../security";
import {
  DevAllOfisListScopeAdapter,
  NoOpOfiComplianceLinkAdapter,
  NoOpOfiNotificationAdapter,
  NoOpOfiTaskAdapter,
  type OfiComplianceLinkPort,
  type OfiListScopePort,
  type OfiNotificationPort,
  type OfiTaskPort,
} from "../ports";
import { createOfiRepository } from "../repositories/ofi.repository";
import {
  createOfiService,
  type OfiService,
} from "../services/ofi.service";
import { createOfiController } from "../controllers/ofi.controller";

export type OfiRouterDeps = {
  authorizer: Authorizer;
  notifications?: OfiNotificationPort;
  tasks?: OfiTaskPort;
  listScope?: OfiListScopePort;
  complianceLinks?: OfiComplianceLinkPort;
};

/**
 * Compose OFI service for route mounting and cross-module adapters.
 */
export function createOfiModule(deps: OfiRouterDeps): {
  service: OfiService;
  router: Router;
} {
  const repository = createOfiRepository();
  const service = createOfiService({
    repository,
    authorizer: deps.authorizer,
    notifications: deps.notifications ?? new NoOpOfiNotificationAdapter(),
    tasks: deps.tasks ?? new NoOpOfiTaskAdapter(),
    listScope: deps.listScope ?? new DevAllOfisListScopeAdapter(),
    complianceLinks:
      deps.complianceLinks ?? new NoOpOfiComplianceLinkAdapter(),
  });
  const controller = createOfiController(service);
  const router = Router();

  router.get("/", controller.list);
  router.get("/stats", controller.stats);
  router.post("/", controller.create);
  router.get("/:id", controller.getById);
  router.patch("/:id", controller.update);
  router.delete("/:id", controller.remove);
  router.post("/:id/implement", controller.implement);
  router.post("/:id/activity", controller.addActivity);
  router.post("/:id/nudge", controller.nudge);
  router.delete("/:id/attachments/:attachmentId", controller.removeAttachment);
  router.put("/:id/compliance-links", controller.setComplianceLinks);

  return { service, router };
}

/**
 * HTTP routes for OFI.
 * Mounted at /api/v1/ofi
 */
export function createOfiRouter(deps: OfiRouterDeps): Router {
  return createOfiModule(deps).router;
}
