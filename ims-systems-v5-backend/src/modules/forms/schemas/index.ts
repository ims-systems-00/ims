import { z } from "zod";
import { FORM_ELEMENT_TYPES, FORM_STATUSES } from "../types";

const objectIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, "Invalid id format");

const themeImageSchema = z
  .object({
    src: z.string().trim().min(1).max(2000),
    storage: z
      .object({
        bucket: z.string().trim().min(1).max(255),
        key: z.string().trim().min(1).max(1024),
        fileName: z.string().trim().max(255).optional(),
      })
      .nullable()
      .optional(),
  })
  .nullable();

const themeSchema = z.object({
  foregroundColor: z.string().trim().min(1).max(32).optional(),
  backgroundColor: z.string().trim().min(1).max(32).optional(),
  accentColor: z.string().trim().min(1).max(32).optional(),
  logo: themeImageSchema.optional(),
  coverImage: themeImageSchema.optional(),
});

const elementSeedSchema = z.object({
  type: z.string().trim().min(1).max(64),
  attributes: z.record(z.string(), z.unknown()).optional(),
});

export const createFormBodySchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(255),
  description: z.string().trim().max(2000).nullable().optional(),
  status: z.enum(FORM_STATUSES).optional(),
  theme: themeSchema.optional(),
  usagesType: z.string().trim().max(120).nullable().optional(),
  availableForStandards: z.array(z.string().trim().min(1)).optional(),
  collaboration: z.array(z.string().trim().min(1)).optional(),
  elements: z.array(elementSeedSchema).max(200).optional(),
});

export const updateFormBodySchema = z
  .object({
    title: z.string().trim().min(1).max(255).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    status: z.enum(FORM_STATUSES).optional(),
    theme: themeSchema.optional(),
    usagesType: z.string().trim().max(120).nullable().optional(),
    availableForStandards: z.array(z.string().trim().min(1)).optional(),
    collaboration: z.array(z.string().trim().min(1)).optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one field must be provided"
  );

export const listFormsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  status: z.enum(FORM_STATUSES).optional(),
  sort: z
    .enum(["createdAt", "updatedAt", "title", "submissionCount"])
    .default("updatedAt"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
  includeDeleted: z
    .union([z.boolean(), z.enum(["true", "false", "1", "0"])])
    .optional()
    .transform((value) => {
      if (value === undefined) return false;
      if (typeof value === "boolean") return value;
      return value === "true" || value === "1";
    }),
});

export const idParamSchema = z.object({
  id: objectIdSchema,
});

export const formIdParamSchema = z.object({
  formId: objectIdSchema,
});

export const formElementParamsSchema = z.object({
  formId: objectIdSchema,
  id: objectIdSchema,
});

export const createFormElementBodySchema = z.object({
  type: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .refine(
      (value) =>
        (FORM_ELEMENT_TYPES as readonly string[]).includes(value) ||
        value.length > 0,
      "Invalid element type"
    ),
  attributes: z.record(z.string(), z.unknown()).optional(),
  afterElementId: objectIdSchema.nullable().optional(),
  parentElementId: objectIdSchema.nullable().optional(),
});

export const updateFormElementBodySchema = z
  .object({
    type: z.string().trim().min(1).max(64).optional(),
    attributes: z.record(z.string(), z.unknown()).optional(),
    parentElementId: objectIdSchema.nullable().optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one field must be provided"
  );

export const reorderFormElementBodySchema = z.object({
  afterElementId: objectIdSchema.nullable(),
});

export const listSubmissionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

export const submissionResponseSchema = z.object({
  formElementId: objectIdSchema,
  responseValue: z.unknown(),
});

export const createSubmissionBodySchema = z.object({
  responses: z.array(submissionResponseSchema).min(0).max(500),
  collectionName: z.string().trim().max(120).nullable().optional(),
  collectionDocument: objectIdSchema.nullable().optional(),
});

export const updateSubmissionBodySchema = z
  .object({
    responses: z.array(submissionResponseSchema).max(500).optional(),
    collectionName: z.string().trim().max(120).nullable().optional(),
    collectionDocument: objectIdSchema.nullable().optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one field must be provided"
  );

export const formSubmissionParamsSchema = z.object({
  formId: objectIdSchema,
  id: objectIdSchema,
});
