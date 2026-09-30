/**
 * Customer Management (CRM) domain types.
 * Spec: docs/module-specifications/customers.md
 */

export const CUSTOMER_STAGES = [
  "Prospect",
  "Warm lead",
  "Qualified",
  "Proposal",
  "Live",
] as const;
export type CustomerStage = (typeof CUSTOMER_STAGES)[number];

export const CUSTOMER_STATUSES = [
  "Open",
  "Closed",
  "Lost",
  "Abandoned",
] as const;
export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];

/** Conversion likelihood for non-live stages (10–90, step 10). */
export const CUSTOMER_PROBABILITIES = [
  10, 20, 30, 40, 50, 60, 70, 80, 90,
] as const;
export type CustomerProbability = (typeof CUSTOMER_PROBABILITIES)[number];

export const DEFAULT_CUSTOMER_LOGO_SRC =
  "https://assets.imssystems.tech/images/system/avatar-placeholder.jpg";

export type CustomerAttachment = {
  id: string;
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
  storageKey?: string;
  url?: string;
  uploadedBy: string;
  uploadedAt: Date;
};

export type CustomerLogo = {
  fileName?: string;
  storageKey?: string;
  url?: string;
  /** Display URL; falls back to system placeholder. */
  src: string;
};

export type Customer = {
  id: string;
  organizationId: string;
  reference: string;
  name: string;
  companyNumber?: string;
  businessUnitId?: string;
  categoryId?: string;
  stage: CustomerStage;
  status: CustomerStatus;
  probability: number;
  source?: string;
  phoneNumber?: string;
  buildingName?: string;
  streetName?: string;
  town?: string;
  postCode?: string;
  primaryContact?: string;
  primaryEmail: string;
  secondaryContact?: string;
  secondaryEmail?: string;
  serviceProvision?: string;
  contractValue: number;
  accountManager?: string;
  accountNumber?: string;
  contractStartDate?: Date | null;
  contractEndDate?: Date | null;
  reviewDate?: Date | null;
  notes?: string;
  reasonForLoss?: string;
  /** Present on V4 model; unused in UI/business logic. */
  isChampion: boolean;
  logo: CustomerLogo;
  attachments: CustomerAttachment[];
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

export type LogoInput = {
  fileName?: string;
  storageKey?: string;
  url?: string;
  src?: string;
};

export type CreateCustomerInput = {
  name: string;
  primaryEmail: string;
  businessUnitId?: string;
  categoryId?: string;
  companyNumber?: string;
  stage?: CustomerStage;
  status?: CustomerStatus;
  probability?: number;
  source?: string;
  phoneNumber?: string;
  buildingName?: string;
  streetName?: string;
  town?: string;
  postCode?: string;
  primaryContact?: string;
  secondaryContact?: string;
  secondaryEmail?: string;
  serviceProvision?: string;
  contractValue?: number;
  accountManager?: string;
  accountNumber?: string;
  contractStartDate?: string | Date | null;
  contractEndDate?: string | Date | null;
  reviewDate?: string | Date | null;
  notes?: string;
  reasonForLoss?: string;
  isChampion?: boolean;
  logo?: LogoInput;
  attachments?: AttachmentInput[];
};

export type UpdateCustomerInput = {
  name?: string;
  primaryEmail?: string;
  businessUnitId?: string | null;
  categoryId?: string | null;
  companyNumber?: string | null;
  stage?: CustomerStage;
  status?: CustomerStatus;
  probability?: number;
  source?: string | null;
  phoneNumber?: string | null;
  buildingName?: string | null;
  streetName?: string | null;
  town?: string | null;
  postCode?: string | null;
  primaryContact?: string | null;
  secondaryContact?: string | null;
  secondaryEmail?: string | null;
  serviceProvision?: string | null;
  contractValue?: number;
  accountManager?: string | null;
  accountNumber?: string | null;
  contractStartDate?: string | Date | null;
  contractEndDate?: string | Date | null;
  reviewDate?: string | Date | null;
  notes?: string | null;
  reasonForLoss?: string | null;
  isChampion?: boolean;
  logo?: LogoInput | null;
  /** Appended (not replaced) on update. */
  attachments?: AttachmentInput[];
};

export type ListCustomersQuery = {
  page: number;
  pageSize: number;
  search?: string;
  stages?: CustomerStage[];
  statuses?: CustomerStatus[];
  businessUnitIds?: string[];
  accountManagerIds?: string[];
  categoryIds?: string[];
  /** Convenience filter: accountManager === current subject. */
  myCustomers?: boolean;
  sort?:
    | "createdOn"
    | "updatedAt"
    | "name"
    | "reference"
    | "stage"
    | "contractValue"
    | "contractEndDate"
    | "reviewDate";
  sortDir?: "asc" | "desc";
};

export type PaginatedCustomers = {
  items: Customer[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type CustomerIncidentOverviewBucket = {
  resolved: boolean;
  count: number;
};

export type CustomerInvoiceStatusBucket = {
  status: string;
  amount: number;
  count: number;
};

/** GET /customers/:id/overviews — Live customer insight. */
export type CustomerOverview = {
  totalInvoices: number;
  totalIncidents: CustomerIncidentOverviewBucket[];
  totalInvoiceAmount: CustomerInvoiceStatusBucket[];
};

export type CustomerStageAnalysis = {
  stage: CustomerStage | string;
  count: number;
  contractValue: number;
};

export type CustomerValueHighlight = {
  name: string;
  value: number;
  stage: string;
};

export type InteractionAnalytics = {
  totalInteractions: number;
  customersEngaged: number;
  topCustomers: Array<{ customerId: string; name: string; count: number }>;
};

/** GET /customers/analytics/manager-overview/:managerId — MY CRM. */
export type AccountManagerOverview = {
  customerAnalysis: CustomerStageAnalysis[];
  invoiceAnalysis: CustomerInvoiceStatusBucket[];
  contractStartedThisMonth: number;
  contractEndingThisMonth: number;
  contractReviewThisMonth: number;
  highestValueCustomer: CustomerValueHighlight;
  mostValuedLiveCustomer: CustomerValueHighlight;
  lessValuedLiveCustomer: CustomerValueHighlight;
  activeCampaign: number;
  closedCampaign: number;
  monthlyCampaign: Array<{ month: string; count: number }>;
  latestCampaign: string;
  interactions: {
    weekly: InteractionAnalytics;
    monthly: InteractionAnalytics;
  };
};

/** Authz resource type (IMS_SERVICES.CRM → customers in V5). */
export const CUSTOMERS_RESOURCE = "customers";

/** Task / incident source module type. */
export const CUSTOMERS_SOURCE_MODULE = "customers";

export function isCustomerStage(value: string): value is CustomerStage {
  return (CUSTOMER_STAGES as readonly string[]).includes(value);
}

export function isCustomerStatus(value: string): value is CustomerStatus {
  return (CUSTOMER_STATUSES as readonly string[]).includes(value);
}

export function isValidProbability(value: number): boolean {
  return (
    Number.isInteger(value) &&
    value >= 10 &&
    value <= 90 &&
    value % 10 === 0
  );
}
