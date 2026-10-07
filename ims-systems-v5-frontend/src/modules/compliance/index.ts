/**
 * Public surface for the Compliance frontend module.
 * Spec: docs/module-specifications/compliance.md
 */

export { ComplianceToolkitPage } from "./pages/compliance-toolkit-page";
export { ControlSheet } from "./components/control-sheet";
export { LinkedControlsPanel } from "./components/linked-controls-panel";
export {
  listComplianceToolkits,
  provisionComplianceToolkit,
  getComplianceOverview,
  listComplianceControls,
  listCatalogueControls,
  getComplianceControl,
  updateComplianceControlStatus,
} from "./api/compliance";
export {
  useComplianceToolkitsQuery,
  useComplianceOverviewQuery,
  useComplianceControlsQuery,
  useCatalogueControlsQuery,
  useComplianceControlQuery,
  useProvisionToolkitMutation,
  useUpdateControlStatusMutation,
  complianceKeys,
} from "./hooks/use-compliance";
export type {
  ComplianceToolkitName,
  ComplianceToolkitSummary,
  ComplianceOverview,
  ControlStatus,
  ControlEvidence,
  ModuleComplianceLink,
  CatalogueControlItem,
  PaginatedCatalogueControls,
} from "./types";
export {
  COMPLIANCE_TOOLKIT_NAMES,
  TOOLKIT_DISPLAY_LABELS,
  toolkitPath,
  toolkitDisplayLabel,
  encodeToolkitName,
  decodeToolkitName,
  isComplianceToolkitName,
} from "./types";
