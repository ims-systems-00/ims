/**
 * Tags and Categories frontend types — `/api/v1/tags-and-categories`.
 * Spec: docs/module-specifications/tags-and-categories.md
 */

/** Full backend enum. */
export const TAG_APPLICABLE_MODULES = [
  "risks",
  "incidents",
  "hardwareassets",
  "softwareassets",
  "peopleassets",
  "premiseassets",
  "informationassets",
  "customers",
  "cips",
  "suppliers",
  "expensereports",
] as const;
export type TagApplicableModule = (typeof TAG_APPLICABLE_MODULES)[number];

/** Modules exposed in FE create/edit pickers (spec excludes CIP/suppliers/expense). */
export const FRONTEND_APPLICABLE_MODULES = [
  "risks",
  "incidents",
  "hardwareassets",
  "softwareassets",
  "peopleassets",
  "premiseassets",
  "informationassets",
  "customers",
] as const;

export const APPLICABLE_MODULE_LABELS: Record<TagApplicableModule, string> = {
  risks: "Risk",
  incidents: "Incidents",
  hardwareassets: "Hardware",
  softwareassets: "Software",
  peopleassets: "People",
  premiseassets: "Premises",
  informationassets: "Information",
  customers: "CRM",
  cips: "CIP",
  suppliers: "Suppliers",
  expensereports: "Expense reports",
};

export type TagAndCategory = {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  applicableModules: TagApplicableModule[];
  createdBy: string;
  createdOn: string;
  updatedBy: string | null;
  updatedOn: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateTagAndCategoryInput = {
  name: string;
  description?: string;
  applicableModules?: TagApplicableModule[];
};

export type UpdateTagAndCategoryInput = {
  name?: string;
  description?: string | null;
};

export type ListTagsAndCategoriesParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  applicableModule?: TagApplicableModule;
  sort?: "createdOn" | "name" | "updatedAt";
  sortDir?: "asc" | "desc";
};

export type PaginatedTagsAndCategories = {
  items: TagAndCategory[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

/** Map inventory asset category → tags applicable module code. */
export function assetCategoryToTagModule(
  category: "hardware" | "software" | "people" | "premise" | "information"
): TagApplicableModule {
  switch (category) {
    case "hardware":
      return "hardwareassets";
    case "software":
      return "softwareassets";
    case "people":
      return "peopleassets";
    case "premise":
      return "premiseassets";
    case "information":
      return "informationassets";
  }
}
