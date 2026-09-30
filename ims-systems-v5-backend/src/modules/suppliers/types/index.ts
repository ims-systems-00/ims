/**
 * Supplier Management domain types.
 * Spec: docs/module-specifications/suppliers.md
 */

export type SupplierAttachment = {
  id: string;
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
  storageKey?: string;
  url?: string;
  uploadedBy: string;
  uploadedAt: Date;
};

export type SupplierKpiObjective = {
  id: string;
  value: string;
};

export type Supplier = {
  id: string;
  organizationId: string;
  reference: string;
  name: string;
  businessUnitId?: string;
  accountManager: string;
  accountNumber: string;
  email: string;
  buyerId?: string;
  serviceProvision: string;
  contractValue: number;
  contractStartDate: Date;
  contractEndDate?: Date | null;
  reviewDate?: Date | null;
  slaFiles: SupplierAttachment[];
  contractFiles: SupplierAttachment[];
  onboardingFiles: SupplierAttachment[];
  kpiObjectives: SupplierKpiObjective[];
  /** Derived: true when any SLA or contract file exists. */
  isCompliant: boolean;
  createdBy: string;
  createdOn: Date;
  updatedBy: string | null;
  updatedOn: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AttachmentInput = {
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
  storageKey?: string;
  url?: string;
};

export type CreateSupplierInput = {
  name: string;
  accountManager: string;
  accountNumber: string;
  email: string;
  serviceProvision: string;
  contractValue: number;
  contractStartDate: string | Date;
  businessUnitId?: string;
  buyerId?: string;
  contractEndDate?: string | Date | null;
  reviewDate?: string | Date | null;
  slaFiles?: AttachmentInput[];
  contractFiles?: AttachmentInput[];
  onboardingFiles?: AttachmentInput[];
};

export type UpdateSupplierInput = {
  name?: string;
  accountManager?: string;
  accountNumber?: string;
  email?: string;
  serviceProvision?: string;
  contractValue?: number;
  contractStartDate?: string | Date;
  buyerId?: string | null;
  contractEndDate?: string | Date | null;
  reviewDate?: string | Date | null;
  /** Appended (not replaced) on update. */
  slaFiles?: AttachmentInput[];
  contractFiles?: AttachmentInput[];
  onboardingFiles?: AttachmentInput[];
};

export type AddKpiObjectiveInput = {
  value: string;
};

export type ListSuppliersQuery = {
  page: number;
  pageSize: number;
  search?: string;
  businessUnitIds?: string[];
  createdByIds?: string[];
  buyerIds?: string[];
  isCompliant?: boolean;
  sort?:
    | "createdOn"
    | "name"
    | "updatedAt"
    | "reference"
    | "contractValue"
    | "contractEndDate"
    | "reviewDate";
  sortDir?: "asc" | "desc";
};

export type PaginatedSuppliers = {
  items: Supplier[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export const SUPPLIER_COMPLIANCE_RISK_LEVELS = [
  "Hazardous",
  "Vulnerable",
  "Unsecure",
  "Secure",
  "Safe",
] as const;
export type SupplierComplianceRiskLevel =
  (typeof SUPPLIER_COMPLIANCE_RISK_LEVELS)[number];

export type SupplierStats = {
  procurementValue: number;
  supplierIncidents: {
    totalIncidents: number;
    openIncidents: number;
    resolvedIncidents: number;
  };
  supplierCompliance: {
    compliant: number;
    inCompliant: number;
    percentage: number;
    riskLevel: SupplierComplianceRiskLevel;
  };
};

export function deriveIsCompliant(input: {
  slaFiles: { length: number };
  contractFiles: { length: number };
}): boolean {
  return input.slaFiles.length > 0 || input.contractFiles.length > 0;
}

export function deriveComplianceRiskLevel(
  percentage: number
): SupplierComplianceRiskLevel {
  if (percentage <= 20) return "Hazardous";
  if (percentage <= 40) return "Vulnerable";
  if (percentage <= 60) return "Unsecure";
  if (percentage <= 80) return "Secure";
  return "Safe";
}

/** Authz resource type. */
export const SUPPLIERS_RESOURCE = "suppliers";

/** Task / incident source module type. */
export const SUPPLIERS_SOURCE_MODULE = "suppliers";
