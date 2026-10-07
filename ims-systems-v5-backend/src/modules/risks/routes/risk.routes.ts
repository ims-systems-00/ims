import { Router } from "express";
import type { Authorizer } from "../../../security";
import {
  DevAllRisksListScopeAdapter,
  NoOpRiskComplianceLinkAdapter,
  NoOpRiskNotificationAdapter,
  NoOpRiskTaskAdapter,
  type RiskComplianceLinkPort,
  type RiskListScopePort,
  type RiskNotificationPort,
  type RiskTaskPort,
} from "../ports";
import { createRiskRepository } from "../repositories/risk.repository";
import {
  createRiskService,
  type RiskService,
} from "../services/risk.service";
import { createRiskController } from "../controllers/risk.controller";

export type RiskRouterDeps = {
  authorizer: Authorizer;
  notifications?: RiskNotificationPort;
  tasks?: RiskTaskPort;
  listScope?: RiskListScopePort;
  complianceLinks?: RiskComplianceLinkPort;
};

/**
 * Compose Risk service for route mounting and cross-module adapters.
 */
export function createRiskModule(deps: RiskRouterDeps): {
  service: RiskService;
  router: Router;
} {
  const repository = createRiskRepository();
  const service = createRiskService({
    repository,
    authorizer: deps.authorizer,
    notifications: deps.notifications ?? new NoOpRiskNotificationAdapter(),
    tasks: deps.tasks ?? new NoOpRiskTaskAdapter(),
    listScope: deps.listScope ?? new DevAllRisksListScopeAdapter(),
    complianceLinks:
      deps.complianceLinks ?? new NoOpRiskComplianceLinkAdapter(),
  });
  const controller = createRiskController(service);
  const router = Router();

  router.get("/", controller.list);
  router.get("/stats", controller.stats);
  router.get("/report", controller.report);
  router.post("/", controller.create);
  router.get("/:id", controller.getById);
  router.patch("/:id", controller.update);
  router.delete("/:id", controller.remove);
  router.post("/:id/mitigate", controller.mitigate);
  router.post("/:id/accept", controller.accept);
  router.post("/:id/escalate", controller.escalate);
  router.post("/:id/nudge", controller.nudge);
  router.delete("/:id/attachments/:attachmentId", controller.removeAttachment);
  router.put("/:id/compliance-links", controller.setComplianceLinks);

  return { service, router };
}

/**
 * HTTP routes for Risk Management.
 * Mounted at /api/v1/risks
 */
export function createRiskRouter(deps: RiskRouterDeps): Router {
  return createRiskModule(deps).router;
}
