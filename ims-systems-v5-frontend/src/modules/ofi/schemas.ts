import { z } from "zod";

const objectIdSchema = z
  .string()
  .trim()
  .regex(/^[a-fA-F0-9]{24}$/, "Invalid id format");

const subjectIdSchema = z.string().trim().min(1, "Owner is required");

const nullableSubjectId = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : null));

export const createOfiFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  opportunityForImprovement: z
    .string()
    .trim()
    .min(1, "Opportunity for improvement is required"),
  ownerId: subjectIdSchema,
  businessUnitId: objectIdSchema,
  cost: z.coerce.number().int().nonnegative().optional().or(z.literal("")),
});

export type CreateOfiFormValues = z.infer<typeof createOfiFormSchema>;

export const updateOfiFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  opportunityForImprovement: z
    .string()
    .trim()
    .min(1, "Opportunity for improvement is required"),
  ownerId: nullableSubjectId,
  cost: z.coerce.number().int().nonnegative().optional().or(z.literal("")),
});

export type UpdateOfiFormValues = z.infer<typeof updateOfiFormSchema>;

export const addOfiActivityFormSchema = z.object({
  message: z.string().trim().min(1, "Activity message is required"),
});

export const attachmentFormSchema = z.object({
  fileName: z.string().trim().min(1, "File name is required"),
  url: z
    .string()
    .trim()
    .url("Must be a valid URL")
    .optional()
    .or(z.literal("")),
});
