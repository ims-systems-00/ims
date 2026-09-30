/**
 * Supplier frontend types — aligned with backend `/api/v1/suppliers`.
 */

export type SupplierAttachment = {
  id: string;
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
  storageKey?: string;
  url?: string;
  uploadedBy: string;
  uploadedAt: string;
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
  contractStartDate: string;
  contractEndDate?: string | null;
  reviewDate?: string | null;
  slaFiles: SupplierAttachment[];
  contractFiles: SupplierAttachment[];
  onboardingFiles: SupplierAttachment[];
  kpiObjectives: SupplierKpiObjective[];
  isCompliant: boolean;
  createdBy: string;
  createdOn: string;
  updatedBy: string | null;
  updatedOn: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
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
  contractStartDate: string;
  businessUnitId?: string;
  buyerId?: string;
  contractEndDate?: string | null;
  reviewDate?: string | null;
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
  contractStartDate?: string;
  buyerId?: string | null;
  contractEndDate?: string | null;
  reviewDate?: string | null;
  slaFiles?: AttachmentInput[];
  contractFiles?: AttachmentInput[];
  onboardingFiles?: AttachmentInput[];
};

export type ListSuppliersParams = {
  page?: number;
  pageSize?: number;
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

/** Task / incident source module type. */
export const SUPPLIERS_SOURCE_MODULE = "suppliers";
