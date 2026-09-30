/**
 * Customer (CRM) frontend types — aligned with backend `/api/v1/customers`.
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

export const CUSTOMER_PROBABILITIES = [
  10, 20, 30, 40, 50, 60, 70, 80, 90,
] as const;

export type CustomerAttachment = {
  id: string;
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
  storageKey?: string;
  url?: string;
  uploadedBy: string;
  uploadedAt: string;
};

export type CustomerLogo = {
  fileName?: string;
  storageKey?: string;
  url?: string;
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
  contractStartDate?: string | null;
  contractEndDate?: string | null;
  reviewDate?: string | null;
  notes?: string;
  reasonForLoss?: string;
  isChampion: boolean;
  logo: CustomerLogo;
  attachments: CustomerAttachment[];
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
  contractStartDate?: string | null;
  contractEndDate?: string | null;
  reviewDate?: string | null;
  notes?: string;
  reasonForLoss?: string;
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
  contractStartDate?: string | null;
  contractEndDate?: string | null;
  reviewDate?: string | null;
  notes?: string | null;
  reasonForLoss?: string | null;
  logo?: LogoInput | null;
  attachments?: AttachmentInput[];
};

export type ListCustomersParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  stages?: CustomerStage[];
  statuses?: CustomerStatus[];
  businessUnitIds?: string[];
  accountManagerIds?: string[];
  categoryIds?: string[];
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

export type CustomerOverview = {
  totalInvoices: number;
  totalIncidents: Array<{ resolved: boolean; count: number }>;
  totalInvoiceAmount: Array<{
    status: string;
    amount: number;
    count: number;
  }>;
};

export type AccountManagerOverview = {
  customerAnalysis: Array<{
    stage: string;
    count: number;
    contractValue: number;
  }>;
  invoiceAnalysis: Array<{ status: string; amount: number; count: number }>;
  contractStartedThisMonth: number;
  contractEndingThisMonth: number;
  contractReviewThisMonth: number;
  highestValueCustomer: { name: string; value: number; stage: string };
  mostValuedLiveCustomer: { name: string; value: number; stage: string };
  lessValuedLiveCustomer: { name: string; value: number; stage: string };
  activeCampaign: number;
  closedCampaign: number;
  monthlyCampaign: Array<{ month: string; count: number }>;
  latestCampaign: string;
  interactions: {
    weekly: {
      totalInteractions: number;
      customersEngaged: number;
      topCustomers: Array<{
        customerId: string;
        name: string;
        count: number;
      }>;
    };
    monthly: {
      totalInteractions: number;
      customersEngaged: number;
      topCustomers: Array<{
        customerId: string;
        name: string;
        count: number;
      }>;
    };
  };
};

/** Task / incident source module type. */
export const CUSTOMERS_SOURCE_MODULE = "customers";
