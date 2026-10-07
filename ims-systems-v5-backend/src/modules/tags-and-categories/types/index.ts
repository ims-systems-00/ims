/**
 * Tags and Categories domain types.
 * Spec: docs/module-specifications/tags-and-categories.md
 *
 * One unified classification label (not separate Tag vs Category types).
 * Assignment on operational records is owned by those modules (single optional reference).
 */

export const TAGS_AND_CATEGORIES_RESOURCE = "tags-and-categories";

/**
 * Applicable module codes from the specification (backend enum).
 * CIP / suppliers / expense reports are backend-supported without confirmed FE UI.
 */
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

export type TagAndCategory = {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  applicableModules: TagApplicableModule[];
  createdBy: string;
  createdOn: Date;
  updatedBy: string | null;
  updatedOn: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateTagAndCategoryInput = {
  name: string;
  description?: string;
  applicableModules?: TagApplicableModule[];
};

/**
 * Spec: update persists name and description only.
 * applicableModules is intentionally not updatable via this path.
 */
export type UpdateTagAndCategoryInput = {
  name?: string;
  description?: string | null;
};

export type ListTagsAndCategoriesQuery = {
  page: number;
  pageSize: number;
  search?: string;
  /** Filter labels whose applicableModules includes this code. */
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

/** Compact projection for selectors / detail display. */
export type TagAndCategoryOption = {
  id: string;
  name: string;
  description: string;
  applicableModules: TagApplicableModule[];
};

export const MAX_TAG_NAME_LENGTH = 120;
export const MAX_TAG_DESCRIPTION_LENGTH = 2000;
export const MAX_APPLICABLE_MODULES = 20;
