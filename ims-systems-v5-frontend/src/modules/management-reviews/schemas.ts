import { z } from "zod";
import { REVIEW_INTERVALS, REVIEW_PRIVACY } from "./types";

const subjectIdSchema = z.string().trim().min(1, "Invalid user id");

const optionalObjectId = z
  .string()
  .trim()
  .optional()
  .refine(
    (value) => !value || /^[a-fA-F0-9]{24}$/.test(value),
    "Must be a valid 24-character id"
  )
  .transform((value) => (value && value.length > 0 ? value : undefined));

const attachmentInputSchema = z.object({
  fileName: z.string().trim().min(1, "File name is required"),
  mimeType: z.string().trim().optional(),
  sizeBytes: z.number().int().nonnegative().optional(),
  storageKey: z.string().trim().optional(),
  url: z
    .string()
    .trim()
    .url("Must be a valid URL")
    .optional()
    .or(z.literal("")),
});

export const createManagementReviewFormSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required"),
    date: z.string().trim().min(1, "Schedule date is required"),
    interval: z.enum(REVIEW_INTERVALS),
    privacy: z.enum(REVIEW_PRIVACY),
    businessUnitId: optionalObjectId,
    time: z.string().trim().optional(),
    attendees: z.array(subjectIdSchema).default([]),
    agenda: z.array(attachmentInputSchema).optional(),
    minutes: z.array(attachmentInputSchema).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.privacy === "Business unit" && !value.businessUnitId) {
      ctx.addIssue({
        code: "custom",
        path: ["businessUnitId"],
        message: "Business unit is required when privacy is Business unit",
      });
    }
  });

export type CreateManagementReviewFormValues = z.infer<
  typeof createManagementReviewFormSchema
>;

export const updateManagementReviewFormSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required"),
    date: z.string().trim().min(1, "Schedule date is required"),
    time: z.string().trim().optional(),
    privacy: z.enum(REVIEW_PRIVACY),
    attendees: z.array(subjectIdSchema).default([]),
  });

export type UpdateManagementReviewFormValues = z.infer<
  typeof updateManagementReviewFormSchema
>;

export const attachmentFormSchema = attachmentInputSchema;
