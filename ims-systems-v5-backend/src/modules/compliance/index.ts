/**
 * Public surface for the Compliance module.
 * Other modules may import only from this entry.
 */

export {
  createComplianceRouter,
  createComplianceModule,
} from "./routes/compliance.routes";
export type { ComplianceRouterDeps } from "./routes/compliance.routes";
export { createComplianceService } from "./services/compliance.service";
export type {
  ComplianceService,
  ComplianceApplicationPort,
} from "./services/compliance.service";
export {
  createComplianceActivityAdapter,
  createComplianceNotificationAdapter,
  createComplianceEvidenceLinkAdapter,
  createRiskComplianceLinkAdapter,
  createComplianceRiskMirrorAdapter,
  createIncidentComplianceLinkAdapter,
  createComplianceIncidentMirrorAdapter,
  createOfiComplianceLinkAdapter,
  createComplianceOfiMirrorAdapter,
} from "./adapters";
export {
  DevAllComplianceLicencesAdapter,
  DevAllowEvidenceLinksAdapter,
  NoOpComplianceActivityAdapter,
  NoOpComplianceAutomationAdapter,
  NoOpComplianceIamGrantAdapter,
  NoOpComplianceNotificationAdapter,
  NoOpComplianceRiskMirrorAdapter,
  NoOpComplianceIncidentMirrorAdapter,
  NoOpComplianceOfiMirrorAdapter,
} from "./ports";
export type {
  ComplianceLicencePort,
  ComplianceIamGrantPort,
  ComplianceNotificationPort,
  ComplianceActivityPort,
  ComplianceAutomationPort,
  ComplianceEvidenceLinkPort,
  ComplianceRiskMirrorPort,
  ComplianceIncidentMirrorPort,
  ComplianceOfiMirrorPort,
} from "./ports";
export { createComplianceControlRepository } from "./repositories/compliance-control.repository";
export { createControlStatusRepository } from "./repositories/control-status.repository";
export { createComplianceOverviewRepository } from "./repositories/compliance-overview.repository";
export { createControlEvidenceRepository } from "./repositories/control-evidence.repository";
export {
  buildCatalogueFromJson,
  TOOLKIT_JSON_FILES,
} from "./lib/catalogue-builder";
export type {
  ComplianceControlTemplate,
  ControlStatus,
  ComplianceOverview,
  ControlEvidence,
  ComplianceToolkitName,
  ComplianceToolkitSummary,
  ComplianceOverviewDetail,
  CompliancePickerItem,
  PaginatedCompliancePicker,
  CatalogueControlItem,
  PaginatedCatalogueControls,
} from "./types";
export {
  COMPLIANCE_RESOURCE,
  COMPLIANCE_TOOLKIT_NAMES,
  FLAT_CALCULATION_TOOLKITS,
  CONTROL_EVIDENCE_TYPES,
  isComplianceToolkitName,
} from "./types";
