/**
 * Compliance frontend domain types.
 * Spec: docs/module-specifications/compliance.md
 * Aligned with V5 backend `/api/v1/compliance`.
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

/** Sidebar / tab labels (licence module deferred — all toolkits visible). */
export const TOOLKIT_DISPLAY_LABELS: Record<ComplianceToolkitName, string> = {
  DSPT: "DSPT (2022)",
  "ISO 27001": "ISO 27001 (2013)",
  "ISO 27001 (2022)": "ISO 27001 (2022)",
  "ISO 27001 (2022 Annex A)": "ISO 27001 (2022 Annex A)",
  "ISO 27002": "ISO 27002",
  "ISO 9001": "ISO 9001",
  "ISO 45001": "ISO 45001",
  "ISO 20000": "ISO 20000 (2018)",
  "BS 9997": "BS 9997",
  "ISO 14001": "ISO 14001",
  "ISO 15686-5": "ISO 15686-5",
  "ESG Toolkit - Environmental": "ESG — Environmental",
  "ESG Toolkit - Social": "ESG — Social",
  "ESG Toolkit - Governance": "ESG — Governance",
  "Building Safety Act": "Building Safety Act",
};

export function toolkitDisplayLabel(
  name: ComplianceToolkitName | string
): string {
  if (Object.prototype.hasOwnProperty.call(TOOLKIT_DISPLAY_LABELS, name)) {
    return TOOLKIT_DISPLAY_LABELS[name as ComplianceToolkitName];
  }
  return name;
}

export const CONTROL_SELECTED_VALUES = ["Selected", "Not selected"] as const;
export type ControlSelected = (typeof CONTROL_SELECTED_VALUES)[number];

export const CONTROL_STATUS_WRITE_STATES = [
  "Implemented",
  "Not implemented",
] as const;
export type ControlStatusWriteState =
  (typeof CONTROL_STATUS_WRITE_STATES)[number];

export type ControlState =
  | "Yes"
  | "No"
  | "Implemented"
  | "Partially implemented"
  | "Not implemented";

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
  uploadedAt: string;
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
  updatedOn: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SectionProgress = {
  section: string;
  title: string;
  totalPercentage: number;
  controlsSelected: number;
  controlsImplemented: number;
  controlCount: number;
};

export type ComplianceOverview = {
  id: string;
  organizationId: string;
  name: ComplianceToolkitName;
  totalPercentage: number;
  controlsSelected: number;
  controlsImplemented: number;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  sections: SectionProgress[];
};

export type ComplianceToolkitSummary = {
  name: ComplianceToolkitName;
  licensed: boolean;
  provisioned: boolean;
  totalPercentage: number | null;
  controlsSelected: number | null;
  controlsImplemented: number | null;
};

export type PaginatedControlStatuses = {
  items: ControlStatus[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type ListControlsParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  section?: string;
  sort?: "clause" | "title" | "updatedOn" | "createdAt";
  sortDir?: "asc" | "desc";
};

export type UpdateControlStatusInput = {
  selected: ControlSelected;
  state: ControlStatusWriteState;
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
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PaginatedControlEvidence = {
  items: ControlEvidence[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type ListControlEvidenceParams = {
  page?: number;
  pageSize?: number;
  evidenceType?: ControlEvidenceType;
  sort?: "createdAt";
  sortDir?: "asc" | "desc";
};

export type CreateControlEvidenceInput = {
  evidenceType: ControlEvidenceType;
  relatedRiskId?: string;
  relatedIncidentId?: string;
  relatedCipId?: string;
  relatedDocumentId?: string;
  textContent?: string;
  fileStorage?: {
    id?: string;
    fileName: string;
    mimeType?: string;
    sizeBytes?: number;
    storageKey?: string;
    url?: string;
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

export type ProvisionToolkitResult = {
  name: ComplianceToolkitName;
  controlCount: number;
};

/** Cross-module link shape (risks, incidents, OFI, audits). */
export type ModuleComplianceLink = {
  toolkitId: string;
  clauseIds: string[];
};

export type CatalogueControlItem = {
  id: string;
  name: ComplianceToolkitName;
  clause: string;
  title: string;
  isLocked: boolean;
  parentClause: string | null;
};

export type ListCatalogueControlsParams = {
  page?: number;
  pageSize?: number;
  search?: string;
};

export type PaginatedCatalogueControls = {
  items: CatalogueControlItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

/** URL-safe toolkit segment helpers. */
export function encodeToolkitName(name: string): string {
  return encodeURIComponent(name);
}

export function decodeToolkitName(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

export function isComplianceToolkitName(
  value: string
): value is ComplianceToolkitName {
  return (COMPLIANCE_TOOLKIT_NAMES as readonly string[]).includes(value);
}

export function selectedDisplayLabel(selected: ControlSelected): string {
  return selected === "Selected" ? "Yes" : "No";
}

export function toolkitPath(name: ComplianceToolkitName | string): string {
  return `/compliance/${encodeToolkitName(name)}`;
}

export function displayControlState(state: ControlState): string {
  if (state === "Yes") return "Implemented";
  if (state === "No") return "Not implemented";
  return state;
}
