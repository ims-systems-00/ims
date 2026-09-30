import { z } from "zod";
import { INCIDENT_PRIORITIES, INCIDENT_PRIVACY } from "../types";

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

export const createIncidentBodySchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().trim().min(1, "Description is required"),
  businessUnitId: objectIdSchema.optional(),
  priority: z.enum(INCIDENT_PRIORITIES).optional(),
  ownerId: subjectIdSchema.optional(),
  methodOfNotification: z.string().trim().optional(),
  affectedService: z.string().trim().optional(),
  categoryId: objectIdSchema.optional(),
  privacy: z.enum(INCIDENT_PRIVACY).optional(),
  attachments: z.array(attachmentInputSchema).optional(),
  source: sourceSchema.optional(),
});

export const updateIncidentBodySchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    description: z.string().trim().min(1).optional(),
    ownerId: subjectIdSchema.nullable().optional(),
    priority: z.enum(INCIDENT_PRIORITIES).optional(),
    methodOfNotification: z.string().trim().nullable().optional(),
    affectedService: z.string().trim().nullable().optional(),
    categoryId: objectIdSchema.nullable().optional(),
    privacy: z.enum(INCIDENT_PRIVACY).optional(),
    resolution: z.string().trim().nullable().optional(),
    resolved: z.boolean().optional(),
    attachments: z.array(attachmentInputSchema).optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one field must be provided"
  );

export const resolveIncidentBodySchema = z.object({
  resolution: z.string().trim().min(1, "Resolution text is required"),
});

export const setComplianceLinksBodySchema = z.object({
  links: z.array(
    z.object({
      toolkitId: z.string().trim().min(1),
      clauseIds: z.array(z.string().trim().min(1)).default([]),
    })
  ),
});

export const listIncidentsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  status: z.enum(["Open", "Escalated", "Resolved"]).optional(),
  businessUnitIds: csvList.pipe(z.array(objectIdSchema).optional()),
  ownerIds: csvList.pipe(z.array(subjectIdSchema).optional()),
  priorities: csvList.pipe(z.array(z.enum(INCIDENT_PRIORITIES)).optional()),
  raisedFrom: z.coerce.date().optional(),
  raisedTo: z.coerce.date().optional(),
  sourceModuleType: z.string().trim().optional(),
  sourceModuleId: z.string().trim().optional(),
  sort: z
    .enum(["raisedOn", "priority", "title", "updatedAt"])
    .default("raisedOn"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

export const idParamSchema = z.object({
  id: objectIdSchema,
});

export const attachmentIdParamSchema = z.object({
  id: objectIdSchema,
  attachmentId: z.string().trim().min(1),
});
