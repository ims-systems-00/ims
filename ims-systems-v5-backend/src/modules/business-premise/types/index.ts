/**
 * Business Premise domain types.
 * Spec: docs/module-specifications/business-premise.md
 *
 * V4 historical name: IAM Group Premise (`grouppremises` / IAM_PREMISES).
 */

export type BusinessPremise = {
  id: string;
  organizationId: string;
  /** Optional; default empty — not auto-generated (unlike Inventory PRE-). */
  reference: string;
  name: string;
  location: string;
  address: string;
  /** Linked Functional Unit ids (V4 field: `groups`). */
  functionalUnitIds: string[];
  createdBy: string;
  createdOn: Date;
  updatedBy: string | null;
  updatedOn: Date | null;
  createdAt: Date;
  updatedAt: Date;
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
  /** When provided, replaces the full association list. */
  functionalUnitIds?: string[];
};

export type AttachFunctionalUnitInput = {
  functionalUnitId: string;
};

export type ListBusinessPremisesQuery = {
  page: number;
  pageSize: number;
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

/** Authz resource type (V4: IAM_PREMISES / Premises). */
export const BUSINESS_PREMISES_RESOURCE = "business-premises";

/**
 * Product associates premises with Internal business function units
 * (confirmed business meaning in the module specification).
 */
export const PREMISE_LINKABLE_ACCESS_TYPE = "Internal business function" as const;
