import { z } from "zod";
import { AUDIT_INTERVALS, AUDIT_TYPES } from "../types";

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

const scoreComponentSchema = z.coerce.number().int().min(1).max(5);

export const createAuditBodySchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  focusArea: z.string().trim().min(1, "Focus area is required"),
  auditorId: subjectIdSchema,
  businessUnitId: objectIdSchema,
  complianceBodyId: objectIdSchema,
  startDate: z.coerce.date(),
  interval: z.enum(AUDIT_INTERVALS),
  type: z.enum(AUDIT_TYPES),
  time: z.string().trim().optional(),
  attachments: z.array(attachmentInputSchema).optional(),
});

export const updateAuditBodySchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    focusArea: z.string().trim().min(1).optional(),
    businessUnitId: objectIdSchema.optional(),
    complianceBodyId: objectIdSchema.optional(),
    startDate: z.coerce.date().optional(),
    time: z.string().trim().nullable().optional(),
    comment: z.string().trim().nullable().optional(),
    attachments: z.array(attachmentInputSchema).optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one field must be provided"
  );

export const createIdentificationBodySchema = z.object({
  nonConformity: z.string().trim().min(1, "Non-conformity is required"),
  rootCause: z.string().trim().min(1, "Root cause is required"),
});

export const updateIdentificationBodySchema = z
  .object({
    nonConformity: z.string().trim().min(1).optional(),
    rootCause: z.string().trim().min(1).optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one field must be provided"
  );

export const createEmbeddedRiskBodySchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().trim().min(1, "Description is required"),
  likelihood: scoreComponentSchema,
  consequence: scoreComponentSchema,
});

export const updateEmbeddedRiskBodySchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    description: z.string().trim().min(1).optional(),
    likelihood: scoreComponentSchema.optional(),
    consequence: scoreComponentSchema.optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one field must be provided"
  );

export const createOfiBodySchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  opportunityForImprovement: z
    .string()
    .trim()
    .min(1, "Opportunity for improvement is required"),
});

export const updateOfiBodySchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    opportunityForImprovement: z.string().trim().min(1).optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one field must be provided"
  );

export const extractReportBodySchema = z.object({
  recipientName: z.string().trim().min(1, "Recipient name is required"),
  recipientEmail: z
    .string()
    .trim()
    .email("Valid recipient email is required")
    .transform((value) => value.toLowerCase()),
});

export const setComplianceLinksBodySchema = z.object({
  links: z.array(
    z.object({
      toolkitId: z.string().trim().min(1),
      clauseIds: z.array(z.string().trim().min(1)).default([]),
    })
  ),
});

export const listAuditsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  type: z.enum(AUDIT_TYPES).optional(),
  status: z.enum(["Scheduled", "Completed"]).optional(),
  upcoming: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .optional()
    .transform((value) => {
      if (value === undefined) return undefined;
      return value === true || value === "true";
    }),
  businessUnitIds: csvList.pipe(z.array(objectIdSchema).optional()),
  auditorIds: csvList.pipe(z.array(subjectIdSchema).optional()),
  scheduleBefore: z.coerce.date().optional(),
  scheduleFrom: z.coerce.date().optional(),
  sort: z
    .enum(["startDate", "title", "updatedAt", "reference"])
    .default("startDate"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

export const idParamSchema = z.object({
  id: objectIdSchema,
});

export const identificationIdParamSchema = z.object({
  id: objectIdSchema,
  identificationId: z.string().trim().min(1),
});

export const riskIdParamSchema = z.object({
  id: objectIdSchema,
  riskId: z.string().trim().min(1),
});

export const ofiIdParamSchema = z.object({
  id: objectIdSchema,
  ofiId: z.string().trim().min(1),
});

export const attachmentIdParamSchema = z.object({
  id: objectIdSchema,
  attachmentId: z.string().trim().min(1),
});
