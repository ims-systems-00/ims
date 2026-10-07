import { z } from "zod";
import {
  MAX_APPLICABLE_MODULES,
  MAX_TAG_DESCRIPTION_LENGTH,
  MAX_TAG_NAME_LENGTH,
  TAG_APPLICABLE_MODULES,
} from "../types";

const objectIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, "Invalid id format");

const applicableModulesSchema = z
  .array(z.enum(TAG_APPLICABLE_MODULES))
  .max(MAX_APPLICABLE_MODULES)
  .optional();

export const createTagAndCategoryBodySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(MAX_TAG_NAME_LENGTH),
  description: z
    .string()
    .trim()
    .max(MAX_TAG_DESCRIPTION_LENGTH)
    .optional()
    .nullable(),
  applicableModules: applicableModulesSchema,
});

export const updateTagAndCategoryBodySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Name is required")
      .max(MAX_TAG_NAME_LENGTH)
      .optional(),
    description: z
      .string()
      .trim()
      .max(MAX_TAG_DESCRIPTION_LENGTH)
      .nullable()
      .optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one field must be provided"
  );

export const listTagsAndCategoriesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(50),
  search: z.string().trim().optional(),
  applicableModule: z.enum(TAG_APPLICABLE_MODULES).optional(),
  sort: z.enum(["createdOn", "name", "updatedAt"]).default("createdOn"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

export const idParamSchema = z.object({
  id: objectIdSchema,
});
