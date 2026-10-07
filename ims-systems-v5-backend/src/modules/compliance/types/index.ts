/**
 * Compliance domain types.
 * Spec: docs/module-specifications/compliance.md
 *
 * CQC is explicitly out of scope (separate module).
 */

export const COMPLIANCE_RESOURCE = "compliance";

/**
 * Licensed toolkit identifiers (V4 IMS_SERVICES display names).
 * Used as `name` on templates, statuses, and overviews.
 */
export const COMPLIANCE_TOOLKIT_NAMES = [
  "DSPT",
  "ISO 27001",
  "ISO 27001 (2022)",
  "ISO 27001 (2022 Annex A)",
  "ISO 27002",
  "ISO 9001",
  "ISO 45001",
  "ISO 20000",
  "BS 9997",
  "ISO 14001",
  "ISO 15686-5",
  "ESG Toolkit - Environmental",
  "ESG Toolkit - Social",
  "ESG Toolkit - Governance",
  "Building Safety Act",
] as const;

export type ComplianceToolkitName =
  (typeof COMPLIANCE_TOOLKIT_NAMES)[number];

/** Toolkits that use flat % calculation (spec § business rules). */
export const FLAT_CALCULATION_TOOLKITS: ReadonlySet<ComplianceToolkitName> =
  new Set(["ISO 27002", "DSPT"]);

export const CONTROL_SELECTED_VALUES = ["Selected", "Not selected"] as const;
export type ControlSelected = (typeof CONTROL_SELECTED_VALUES)[number];

export const CONTROL_STATE_VALUES = [
  "Yes",
  "No",
  "Implemented",
  "Partially implemented",
  "Not implemented",
] as const;
export type ControlState = (typeof CONTROL_STATE_VALUES)[number];

/** Primary UI write path values (spec forms). */
export const CONTROL_STATUS_WRITE_STATES = [
  "Implemented",
  "Not implemented",
] as const;
export type ControlStatusWriteState =
  (typeof CONTROL_STATUS_WRITE_STATES)[number];

export const CONTROL_EVIDENCE_TYPES = [
  "raw-file",
  "text-content",
  "risk-management",
  "incident-management",
  "cip",
  "document-management",
] as const;
export type ControlEvidenceType = (typeof CONTROL_EVIDENCE_TYPES)[number];

export type ComplianceAttachment = {
  id: string;
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
  storageKey?: string;
  url?: string;
  uploadedBy: string;
  uploadedAt: Date;
};

/** Global catalogue template (no organizationId). */
export type ComplianceControlTemplate = {
  id: string;
  name: ComplianceToolkitName;
  clause: string;
  title: string;
  description: string;
  annex: string;
  note: string;
  isLocked: boolean;
  parentClause: string | null;
  childrenClauses: string[];
  moreInfo: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ControlStatus = {
  id: string;
  organizationId: string;
  name: ComplianceToolkitName;
  controlId: string;
  clause: string;
  title: string;
  description: string;
  annex: string;
  note: string;
  isLocked: boolean;
  parentClause: string | null;
  childrenClauses: string[];
  moreInfo: Record<string, unknown> | null;
  selected: ControlSelected;
  state: ControlState;
  compliancePercentage: number;
  numberOfCompliantChildren: number;
  evidences: ComplianceAttachment[];
  responsibleUserId: string | null;
  accountableUserId: string | null;
  consultedUserId: string | null;
  informedUserId: string | null;
  groupId: string | null;
  updatedBy: string | null;
  updatedOn: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ComplianceOverview = {
  id: string;
  organizationId: string;
  name: ComplianceToolkitName;
  totalPercentage: number;
  controlsSelected: number;
  controlsImplemented: number;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type SectionProgress = {
  section: string;
  title: string;
  totalPercentage: number;
  controlsSelected: number;
  controlsImplemented: number;
  controlCount: number;
};

export type ComplianceOverviewDetail = ComplianceOverview & {
  sections: SectionProgress[];
};

export type ControlEvidence = {
  id: string;
  organizationId: string;
  controlStatusId: string;
  evidenceType: ControlEvidenceType;
  relatedRiskId: string | null;
  relatedIncidentId: string | null;
  relatedCipId: string | null;
  relatedDocumentId: string | null;
  textContent: string | null;
  fileStorage: ComplianceAttachment | null;
  groupId: string | null;
  updatedBy: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ComplianceToolkitSummary = {
  name: ComplianceToolkitName;
  licensed: boolean;
  provisioned: boolean;
  totalPercentage: number | null;
  controlsSelected: number | null;
  controlsImplemented: number | null;
};

export type ProvisionToolkitInput = {
  name: ComplianceToolkitName;
};

export type UpdateControlStatusInput = {
  selected: ControlSelected;
  state: ControlStatusWriteState;
};

export type UpdateControlRaciInput = {
  responsibleUserId?: string | null;
  accountableUserId?: string | null;
  consultedUserId?: string | null;
  informedUserId?: string | null;
  groupId?: string | null;
};

export type ListControlsQuery = {
  page: number;
  pageSize: number;
  search?: string;
  /** Clause prefix / section filter (e.g. "4" or "4.2"). */
  section?: string;
  sort?: "clause" | "title" | "updatedOn" | "createdAt";
  sortDir?: "asc" | "desc";
};

export type PaginatedControlStatuses = {
  items: ControlStatus[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type ListControlEvidenceQuery = {
  page: number;
  pageSize: number;
  evidenceType?: ControlEvidenceType;
  sort?: "createdAt";
  sortDir?: "asc" | "desc";
};

export type PaginatedControlEvidence = {
  items: ControlEvidence[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type CreateControlEvidenceInput = {
  evidenceType: ControlEvidenceType;
  relatedRiskId?: string;
  relatedIncidentId?: string;
  relatedCipId?: string;
  relatedDocumentId?: string;
  textContent?: string;
  fileStorage?: Omit<ComplianceAttachment, "id" | "uploadedBy" | "uploadedAt"> & {
    id?: string;
  };
  groupId?: string | null;
};

export type AddEmbeddedEvidenceInput = {
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
  storageKey?: string;
  url?: string;
};

export type CompliancePickerQuery = {
  page: number;
  pageSize: number;
  search?: string;
  name?: ComplianceToolkitName;
};

export type CompliancePickerItem = {
  controlStatusId: string;
  controlId: string;
  name: ComplianceToolkitName;
  clause: string;
  title: string;
  isLocked: boolean;
  selected: ControlSelected;
  state: ControlState;
  compliancePercentage: number;
};

export type PaginatedCompliancePicker = {
  items: CompliancePickerItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

/** Global catalogue browse (no org provision required). */
export type ListCatalogueControlsQuery = {
  page: number;
  pageSize: number;
  search?: string;
};

export type CatalogueControlItem = {
  id: string;
  name: ComplianceToolkitName;
  clause: string;
  title: string;
  isLocked: boolean;
  parentClause: string | null;
};

export type PaginatedCatalogueControls = {
  items: CatalogueControlItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export function isImplementedState(state: ControlState): boolean {
  return state === "Implemented" || state === "Yes";
}

export function isComplianceToolkitName(
  value: string
): value is ComplianceToolkitName {
  return (COMPLIANCE_TOOLKIT_NAMES as readonly string[]).includes(value);
}
