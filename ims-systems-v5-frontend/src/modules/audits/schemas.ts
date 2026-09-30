import { z } from "zod";
import { AUDIT_INTERVALS, AUDIT_TYPES } from "./types";

const objectIdSchema = z
  .string()
  .trim()
  .regex(/^[a-fA-F0-9]{24}$/, "Invalid id format");

const subjectIdSchema = z.string().trim().min(1, "Auditor is required");

export const createAuditFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  focusArea: z.string().trim().min(1, "Focus area is required"),
  auditorId: subjectIdSchema,
  businessUnitId: objectIdSchema,
  complianceBodyId: objectIdSchema,
  startDate: z.string().trim().min(1, "Schedule date is required"),
  interval: z.enum(AUDIT_INTERVALS),
  type: z.enum(AUDIT_TYPES),
  time: z.string().trim().optional(),
});

export type CreateAuditFormValues = z.infer<typeof createAuditFormSchema>;

export const updateAuditFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  focusArea: z.string().trim().min(1, "Focus area is required"),
  businessUnitId: objectIdSchema,
  complianceBodyId: objectIdSchema,
  startDate: z.string().trim().min(1, "Schedule date is required"),
  time: z.string().trim().optional(),
  comment: z.string().trim().optional(),
});

export type UpdateAuditFormValues = z.infer<typeof updateAuditFormSchema>;

export const identificationFormSchema = z.object({
  nonConformity: z.string().trim().min(1, "Non-conformity is required"),
  rootCause: z.string().trim().min(1, "Root cause is required"),
});

export const embeddedRiskFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().trim().min(1, "Description is required"),
  likelihood: z.coerce.number().int().min(1).max(5),
  consequence: z.coerce.number().int().min(1).max(5),
});

export const ofiFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  opportunityForImprovement: z
    .string()
    .trim()
    .min(1, "Opportunity for improvement is required"),
});

export const extractReportFormSchema = z.object({
  recipientName: z.string().trim().min(1, "Recipient name is required"),
  recipientEmail: z
    .string()
    .trim()
    .email("Valid recipient email is required"),
});
