import { z } from "zod";
import { REVIEW_INTERVALS, REVIEW_PRIVACY } from "../types";

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

export const createManagementReviewBodySchema = z
  .object({
    title: z.string().trim().min(1, "Title is required"),
    date: z.coerce.date(),
    interval: z.enum(REVIEW_INTERVALS),
    privacy: z.enum(REVIEW_PRIVACY).optional(),
    businessUnitId: objectIdSchema.optional(),
    time: z.string().trim().optional(),
    attendees: z.array(subjectIdSchema).optional(),
    agenda: z.array(attachmentInputSchema).optional(),
    minutes: z.array(attachmentInputSchema).optional(),
  })
  .superRefine((value, ctx) => {
    const privacy = value.privacy ?? "Organisational";
    if (privacy === "Business unit" && !value.businessUnitId) {
      ctx.addIssue({
        code: "custom",
        path: ["businessUnitId"],
        message: "Business unit is required when privacy is Business unit",
      });
    }
  });

export const updateManagementReviewBodySchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    date: z.coerce.date().optional(),
    time: z.string().trim().nullable().optional(),
    privacy: z.enum(REVIEW_PRIVACY).optional(),
    attendees: z.array(subjectIdSchema).optional(),
    agenda: z.array(attachmentInputSchema).optional(),
    minutes: z.array(attachmentInputSchema).optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one field must be provided"
  );

export const listManagementReviewsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  status: z.enum(["Scheduled", "Completed"]).optional(),
  businessUnitIds: csvList.pipe(z.array(objectIdSchema).optional()),
  attendeeIds: csvList.pipe(z.array(subjectIdSchema).optional()),
  privacy: z.enum(REVIEW_PRIVACY).optional(),
  interval: z.enum(REVIEW_INTERVALS).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  sort: z
    .enum(["date", "title", "updatedAt", "reference"])
    .default("date"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

export const idParamSchema = z.object({
  id: objectIdSchema,
});

export const attachmentIdParamSchema = z.object({
  id: objectIdSchema,
  attachmentId: z.string().trim().min(1),
});

export const attendeeIdParamSchema = z.object({
  id: objectIdSchema,
  attendeeId: subjectIdSchema,
});

export const addAttendeeBodySchema = z.object({
  attendeeId: subjectIdSchema,
});

export const addAttachmentsBodySchema = z.object({
  attachments: z.array(attachmentInputSchema).min(1),
});
