import { z } from "zod";
import { OFI_IMPLEMENTATION_STATUSES } from "../types";

const objectIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, "Invalid id format");

const subjectIdSchema = z.string().trim().min(1, "Invalid user id");

const attachmentInputSchema = z.object({
  fileName: z.string().trim().min(1, "fileName is required"),
  mimeType: z.string().trim().optional(),
  sizeBytes: z.number().int().nonnegative().optional(),
  storageKey: z.string().trim().optional(),
  url: z.string().trim().url().optional().or(z.literal("")),
});

const sourceSchema = z.object({
  moduleType: z.string().trim().min(1),
  moduleId: z.string().trim().min(1),
});

const csvList = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined;
    const parts = Array.isArray(value)
      ? value
      : value.split(",").map((part) => part.trim());
    return parts.filter((part) => part.length > 0);
  });

export const createOfiBodySchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  opportunityForImprovement: z
    .string()
    .trim()
    .min(1, "Opportunity for improvement is required"),
  ownerId: subjectIdSchema,
  businessUnitId: objectIdSchema,
  cost: z.coerce.number().int().nonnegative().optional(),
  attachments: z.array(attachmentInputSchema).optional(),
  source: sourceSchema.optional(),
});

export const updateOfiBodySchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    opportunityForImprovement: z.string().trim().min(1).optional(),
    ownerId: subjectIdSchema.nullable().optional(),
    cost: z.coerce.number().int().nonnegative().nullable().optional(),
    attachments: z.array(attachmentInputSchema).optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one field must be provided"
  );

export const listOfisQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  status: z.enum(OFI_IMPLEMENTATION_STATUSES).optional(),
  businessUnitIds: csvList.pipe(z.array(objectIdSchema).optional()),
  ownerIds: csvList.pipe(z.array(subjectIdSchema).optional()),
  sourceModuleType: z.string().trim().optional(),
  sourceModuleId: z.string().trim().optional(),
  sort: z
    .enum(["createdOn", "title", "updatedAt", "reference"])
    .default("createdOn"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

export const idParamSchema = z.object({
  id: objectIdSchema,
});

export const attachmentIdParamSchema = z.object({
  id: objectIdSchema,
  attachmentId: z.string().trim().min(1),
});

export const addActivityBodySchema = z.object({
  message: z.string().trim().min(1, "Activity message is required"),
});

export const setComplianceLinksBodySchema = z.object({
  links: z.array(
    z.object({
      toolkitId: z.string().trim().min(1),
      clauseIds: z.array(z.string().trim().min(1)).default([]),
    })
  ),
});
