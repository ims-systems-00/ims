import { Router } from "express";
import type { Authorizer } from "../../../security";
import {
  DevAllComplianceLicencesAdapter,
  DevAllowEvidenceLinksAdapter,
  NoOpComplianceActivityAdapter,
  NoOpComplianceAutomationAdapter,
  NoOpComplianceIamGrantAdapter,
  NoOpComplianceNotificationAdapter,
  NoOpComplianceIncidentMirrorAdapter,
  NoOpComplianceOfiMirrorAdapter,
  NoOpComplianceRiskMirrorAdapter,
  type ComplianceActivityPort,
  type ComplianceAutomationPort,
  type ComplianceEvidenceLinkPort,
  type ComplianceIamGrantPort,
  type ComplianceIncidentMirrorPort,
  type ComplianceLicencePort,
  type ComplianceNotificationPort,
  type ComplianceOfiMirrorPort,
  type ComplianceRiskMirrorPort,
} from "../ports";
import { createComplianceControlRepository } from "../repositories/compliance-control.repository";
import { createComplianceOverviewRepository } from "../repositories/compliance-overview.repository";
import { createControlEvidenceRepository } from "../repositories/control-evidence.repository";
import { createControlStatusRepository } from "../repositories/control-status.repository";
import { createComplianceController } from "../controllers/compliance.controller";
import {
  createComplianceService,
  type ComplianceApplicationPort,
  type ComplianceService,
} from "../services/compliance.service";

export type ComplianceRouterDeps = {
  authorizer: Authorizer;
  licences?: ComplianceLicencePort;
  iamGrant?: ComplianceIamGrantPort;
  notifications?: ComplianceNotificationPort;
  activities?: ComplianceActivityPort;
  automation?: ComplianceAutomationPort;
  evidenceLinks?: ComplianceEvidenceLinkPort;
  riskMirror?: ComplianceRiskMirrorPort;
  incidentMirror?: ComplianceIncidentMirrorPort;
  ofiMirror?: ComplianceOfiMirrorPort;
};

/**
 * Compose Compliance module.
 * Mounted at /api/v1/compliance
 */
export function createComplianceModule(deps: ComplianceRouterDeps): {
  service: ComplianceService;
  application: ComplianceApplicationPort;
  router: Router;
} {
  const controls = createComplianceControlRepository();
  const statuses = createControlStatusRepository();
  const overviews = createComplianceOverviewRepository();
  const evidence = createControlEvidenceRepository();

  const service = createComplianceService({
    controls,
    statuses,
    overviews,
    evidence,
    authorizer: deps.authorizer,
    licences: deps.licences ?? new DevAllComplianceLicencesAdapter(),
    iamGrant: deps.iamGrant ?? new NoOpComplianceIamGrantAdapter(),
    notifications:
      deps.notifications ?? new NoOpComplianceNotificationAdapter(),
    activities: deps.activities ?? new NoOpComplianceActivityAdapter(),
    automation: deps.automation ?? new NoOpComplianceAutomationAdapter(),
    evidenceLinks: deps.evidenceLinks ?? new DevAllowEvidenceLinksAdapter(),
    riskMirror: deps.riskMirror ?? new NoOpComplianceRiskMirrorAdapter(),
    incidentMirror:
      deps.incidentMirror ?? new NoOpComplianceIncidentMirrorAdapter(),
    ofiMirror: deps.ofiMirror ?? new NoOpComplianceOfiMirrorAdapter(),
  });

  const controller = createComplianceController(service);
  const router = Router();

  router.get("/toolkits", controller.listToolkits);
  router.post("/toolkits", controller.provisionToolkit);
  router.delete("/toolkits/:name", controller.deleteToolkit);
  router.get("/toolkits/:name/overview", controller.getOverview);
  router.get("/toolkits/:name/controls", controller.listControls);
  router.get("/catalogues/:name/controls", controller.listCatalogueControls);

  router.get("/picker", controller.picker);

  router.get("/controls/:id", controller.getControl);
  router.put("/controls/:id/status", controller.updateControlStatus);
  router.patch("/controls/:id", controller.updateControlRaci);

  router.get("/controls/:id/control-evidence", controller.listControlEvidence);
  router.post("/controls/:id/control-evidence", controller.addControlEvidence);
  router.delete(
    "/controls/:id/control-evidence/:evidenceId",
    controller.removeControlEvidence
  );

  router.post("/controls/:id/evidence", controller.addEmbeddedEvidence);
  router.delete(
    "/controls/:id/evidence/:attachmentId",
    controller.removeEmbeddedEvidence
  );

  return {
    service,
    application: {
      frameworkPercentages: (organizationId) =>
        service.frameworkPercentagesForOrganization(organizationId),
      getControlStatusById: (organizationId, id) =>
        service.getControlStatusForOrganization(organizationId, id),
      listPicker: (organizationId, query) =>
        service.pickerForOrganization(organizationId, query),
      syncRiskComplianceLinks: (input) =>
        service.syncRiskComplianceLinks(input),
      clearRiskComplianceEvidence: (input) =>
        service.clearRiskComplianceEvidence(input),
      syncIncidentComplianceLinks: (input) =>
        service.syncIncidentComplianceLinks(input),
      clearIncidentComplianceEvidence: (input) =>
        service.clearIncidentComplianceEvidence(input),
      syncOfiComplianceLinks: (input) => service.syncOfiComplianceLinks(input),
      clearOfiComplianceEvidence: (input) =>
        service.clearOfiComplianceEvidence(input),
    },
    router,
  };
}

export function createComplianceRouter(deps: ComplianceRouterDeps): Router {
  return createComplianceModule(deps).router;
}
