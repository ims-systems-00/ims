import { z } from "zod";
import { INCIDENT_PRIORITIES, INCIDENT_PRIVACY } from "./types";

const objectIdSchema = z
  .string()
  .trim()
  .regex(/^[a-fA-F0-9]{24}$/, "Invalid id format");

const subjectIdSchema = z.string().trim().min(1, "Owner is required");

const optionalObjectId = z
  .string()
  .trim()
  .optional()
  .refine(
    (value) => !value || /^[a-fA-F0-9]{24}$/.test(value),
    "Must be a valid 24-character id"
  )
  .transform((value) => (value && value.length > 0 ? value : undefined));

const nullableSubjectId = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : null));

/**
 * Create form: UI requires title (≥8), description, business unit, owner, priority.
 * Backend requires title + description only.
 */
export const createIncidentFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(8, "Title must be at least 8 characters"),
  description: z.string().trim().min(1, "Description is required"),
  businessUnitId: objectIdSchema,
  priority: z.enum(INCIDENT_PRIORITIES),
  ownerId: subjectIdSchema,
  methodOfNotification: z.string().trim().optional(),
  affectedService: z.string().trim().optional(),
  privacy: z.enum(INCIDENT_PRIVACY),
  categoryId: optionalObjectId,
});

export type CreateIncidentFormValues = z.infer<typeof createIncidentFormSchema>;

export const updateIncidentFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(8, "Title must be at least 8 characters"),
    description: z.string().trim().min(1, "Description is required"),
    ownerId: nullableSubjectId,
    priority: z.enum(INCIDENT_PRIORITIES),
    methodOfNotification: z.string().trim().optional(),
    affectedService: z.string().trim().optional(),
    privacy: z.enum(INCIDENT_PRIVACY),
    categoryId: optionalObjectId,
    resolution: z.string().trim().optional(),
    resolved: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.resolved && !value.resolution?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["resolution"],
        message: "Resolution text is required when marking resolved",
      });
    }
  });

export type UpdateIncidentFormValues = z.infer<typeof updateIncidentFormSchema>;

export const resolveIncidentFormSchema = z.object({
  resolution: z.string().trim().min(1, "Resolution text is required"),
});

/** Kept for typed helpers. */
export const incidentOptionalUnitId = optionalObjectId;
