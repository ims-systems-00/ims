import { Router } from "express";
import type { Authorizer } from "../../../security";
import {
  DevAllAuditsListScopeAdapter,
  NoOpAuditCalendarAdapter,
  NoOpAuditCipPromotionAdapter,
  NoOpAuditIncidentPromotionAdapter,
  NoOpAuditNotificationAdapter,
  NoOpAuditReportAdapter,
  NoOpAuditRiskPromotionAdapter,
  NoOpAuditTaskAdapter,
  type AuditCalendarPort,
  type AuditCipPromotionPort,
  type AuditIncidentPromotionPort,
  type AuditListScopePort,
  type AuditNotificationPort,
  type AuditReportPort,
  type AuditRiskPromotionPort,
  type AuditTaskPort,
} from "../ports";
import { createAuditRepository } from "../repositories/audit.repository";
import {
  createAuditService,
  type AuditService,
} from "../services/audit.service";
import { createAuditController } from "../controllers/audit.controller";

export type AuditRouterDeps = {
  authorizer: Authorizer;
  notifications?: AuditNotificationPort;
  calendar?: AuditCalendarPort;
  tasks?: AuditTaskPort;
  reports?: AuditReportPort;
  listScope?: AuditListScopePort;
  incidents?: AuditIncidentPromotionPort;
  risks?: AuditRiskPromotionPort;
  cips?: AuditCipPromotionPort;
};

/**
 * Compose Audit service for route mounting and cross-module adapters.
 */
export function createAuditModule(deps: AuditRouterDeps): {
  service: AuditService;
  router: Router;
} {
  const repository = createAuditRepository();
  const service = createAuditService({
    repository,
    authorizer: deps.authorizer,
    notifications: deps.notifications ?? new NoOpAuditNotificationAdapter(),
    calendar: deps.calendar ?? new NoOpAuditCalendarAdapter(),
    tasks: deps.tasks ?? new NoOpAuditTaskAdapter(),
    reports: deps.reports ?? new NoOpAuditReportAdapter(),
    listScope: deps.listScope ?? new DevAllAuditsListScopeAdapter(),
    incidents: deps.incidents ?? new NoOpAuditIncidentPromotionAdapter(),
    risks: deps.risks ?? new NoOpAuditRiskPromotionAdapter(),
    cips: deps.cips ?? new NoOpAuditCipPromotionAdapter(),
  });
  const controller = createAuditController(service);
  const router = Router();

  router.get("/", controller.list);
  router.get("/stats", controller.stats);
  router.post("/", controller.create);
  router.get("/:id", controller.getById);
  router.patch("/:id", controller.update);
  router.delete("/:id", controller.remove);
  router.post("/:id/complete", controller.complete);
  router.post("/:id/identifications", controller.addIdentification);
  router.patch(
    "/:id/identifications/:identificationId",
    controller.updateIdentification
  );
  router.delete(
    "/:id/identifications/:identificationId",
    controller.removeIdentification
  );
  router.post("/:id/risks", controller.addRisk);
  router.patch("/:id/risks/:riskId", controller.updateRisk);
  router.delete("/:id/risks/:riskId", controller.removeRisk);
  router.post("/:id/ofis", controller.addOfi);
  router.patch("/:id/ofis/:ofiId", controller.updateOfi);
  router.delete("/:id/ofis/:ofiId", controller.removeOfi);
  router.delete("/:id/attachments/:attachmentId", controller.removeAttachment);
  router.put("/:id/compliance-links", controller.setComplianceLinks);
  router.post("/:id/reports", controller.extractReport);

  return { service, router };
}

/**
 * HTTP routes for Audit.
 * Mounted at /api/v1/audits
 */
export function createAuditRouter(deps: AuditRouterDeps): Router {
  return createAuditModule(deps).router;
}
