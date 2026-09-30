/**
 * Business Premise frontend types — mirror V5 backend contracts.
 * Spec: docs/module-specifications/business-premise.md
 */

export type BusinessPremise = {
  id: string;
  organizationId: string;
  reference: string;
  name: string;
  location: string;
  address: string;
  functionalUnitIds: string[];
  createdBy: string;
  createdOn: string;
  updatedBy: string | null;
  updatedOn: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateBusinessPremiseInput = {
  name: string;
  location: string;
  address: string;
  functionalUnitIds: string[];
};

export type UpdateBusinessPremiseInput = {
  name?: string;
  location?: string;
  address?: string;
  functionalUnitIds?: string[];
};

export type ListBusinessPremisesParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: "createdOn" | "name" | "location" | "updatedAt" | "reference";
  sortDir?: "asc" | "desc";
};

export type PaginatedBusinessPremises = {
  items: BusinessPremise[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

/** Authz resource type used by backend Authorizer. */
export const BUSINESS_PREMISES_RESOURCE = "business-premises";

/** Only Internal business function units may be linked (backend rule). */
export const PREMISE_LINKABLE_ACCESS_TYPE = "Internal business function" as const;
