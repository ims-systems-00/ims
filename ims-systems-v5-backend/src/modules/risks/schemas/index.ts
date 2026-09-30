import { z } from "zod";
import { RISK_TYPES } from "../types";

export const riskTypeSchema = z.enum(RISK_TYPES);

const objectIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, "Invalid id format");

const scoreComponentSchema = z.coerce
  .number()
  .int()
  .min(1, "Must be between 1 and 5")
  .max(5, "Must be between 1 and 5");

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

export const createRiskBodySchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().trim().min(1, "Description is required"),
  type: riskTypeSchema,
  businessUnitId: objectIdSchema.optional(),
  categoryId: objectIdSchema.optional(),
  assetId: objectIdSchema.optional(),
  ownerId: objectIdSchema.optional(),
  likelihood: scoreComponentSchema.default(1),
  consequence: scoreComponentSchema.default(1),
  attachments: z.array(attachmentInputSchema).optional(),
  source: sourceSchema.optional(),
});

export const updateRiskBodySchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    description: z.string().trim().min(1).optional(),
    type: riskTypeSchema.optional(),
    categoryId: objectIdSchema.nullable().optional(),
    assetId: objectIdSchema.nullable().optional(),
    ownerId: objectIdSchema.nullable().optional(),
    likelihood: scoreComponentSchema.optional(),
    consequence: scoreComponentSchema.optional(),
    mitigationText: z.string().trim().nullable().optional(),
    acceptanceRationale: z.string().trim().nullable().optional(),
    decisionMaker: z.string().trim().nullable().optional(),
    mitigated: z.boolean().optional(),
    accepted: z.boolean().optional(),
    attachments: z.array(attachmentInputSchema).optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one field must be provided"
  );

export const mitigateRiskBodySchema = z.object({
  mitigationText: z.string().trim().min(1, "Mitigation text is required"),
});

export const acceptRiskBodySchema = z.object({
  acceptanceRationale: z
    .string()
    .trim()
    .min(1, "Acceptance rationale is required"),
  decisionMaker: z.string().trim().optional(),
});

export const setComplianceLinksBodySchema = z.object({
  links: z.array(
    z.object({
      toolkitId: z.string().trim().min(1),
      clauseIds: z.array(z.string().trim().min(1)).default([]),
    })
  ),
});

export const listRisksQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  status: z.enum(["Open", "Escalated", "Mitigated", "Accepted"]).optional(),
  businessUnitIds: csvList.pipe(z.array(objectIdSchema).optional()),
  ownerIds: csvList.pipe(z.array(objectIdSchema).optional()),
  categoryIds: csvList.pipe(z.array(objectIdSchema).optional()),
  types: csvList.pipe(z.array(riskTypeSchema).optional()),
  raisedFrom: z.coerce.date().optional(),
  raisedTo: z.coerce.date().optional(),
  sort: z.enum(["raisedOn", "score", "title", "updatedAt"]).default("raisedOn"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

export const idParamSchema = z.object({
  id: objectIdSchema,
});

export const attachmentIdParamSchema = z.object({
  id: objectIdSchema,
  attachmentId: z.string().trim().min(1),
});
