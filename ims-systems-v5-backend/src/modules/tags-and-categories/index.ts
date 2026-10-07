/**
 * Public surface for the Tags and Categories module.
 * Other modules may import only from this entry.
 *
 * Do not import the Mongoose model or repository from outside this module.
 * Assignment of a label onto risks/incidents/assets/customers is owned by
 * those modules (single optional reference), not by this catalogue.
 */

export {
  createTagsAndCategoriesRouter,
  createTagsAndCategoriesModule,
} from "./routes/tags-and-categories.routes";
export type { TagsAndCategoriesRouterDeps } from "./routes/tags-and-categories.routes";
export { createTagsAndCategoriesService } from "./services/tags-and-categories.service";
export type {
  TagsAndCategoriesService,
  TagsAndCategoriesApplicationPort,
} from "./services/tags-and-categories.service";
export { createTagAndCategoryRepository } from "./repositories/tag-and-category.repository";
export type {
  TagAndCategory,
  TagAndCategoryOption,
  CreateTagAndCategoryInput,
  UpdateTagAndCategoryInput,
  ListTagsAndCategoriesQuery,
  PaginatedTagsAndCategories,
  TagApplicableModule,
} from "./types";
export {
  TAGS_AND_CATEGORIES_RESOURCE,
  TAG_APPLICABLE_MODULES,
  MAX_TAG_NAME_LENGTH,
  MAX_TAG_DESCRIPTION_LENGTH,
  MAX_APPLICABLE_MODULES,
} from "./types";
