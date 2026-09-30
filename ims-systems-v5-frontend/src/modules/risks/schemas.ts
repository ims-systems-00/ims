import { z } from "zod";
import { RISK_TYPES } from "./types";

const objectIdSchema = z
  .string()
  .trim()
  .regex(/^[a-fA-F0-9]{24}$/, "Invalid id format");

const optionalObjectId = z
  .string()
  .trim()
  .optional()
  .refine(
    (value) => !value || /^[a-fA-F0-9]{24}$/.test(value),
    "Must be a valid 24-character id"
  )
  .transform((value) => (value && value.length > 0 ? value : undefined));

const nullableObjectId = z
  .string()
  .trim()
  .optional()
  .refine(
    (value) => !value || /^[a-fA-F0-9]{24}$/.test(value),
    "Must be a valid 24-character id"
  )
  .transform((value) => (value && value.length > 0 ? value : null));

const scoreComponentSchema = z.coerce
  .number()
  .int("Must be a whole number")
  .min(1, "Must be between 1 and 5")
  .max(5, "Must be between 1 and 5");

/**
 * Create form: UI requires owner (spec); backend treats owner as optional.
 * Likelihood and consequence are required in the form.
 */
export const createRiskFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().trim().min(1, "Description is required"),
  type: z.enum(RISK_TYPES),
  ownerId: objectIdSchema,
  businessUnitId: optionalObjectId,
  assetId: optionalObjectId,
  likelihood: scoreComponentSchema,
  consequence: scoreComponentSchema,
});

export type CreateRiskFormValues = z.infer<typeof createRiskFormSchema>;

export const updateRiskFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().trim().min(1, "Description is required"),
  type: z.enum(RISK_TYPES),
  ownerId: nullableObjectId,
  assetId: nullableObjectId,
  likelihood: scoreComponentSchema,
  consequence: scoreComponentSchema,
  mitigationText: z.string().trim().optional(),
  acceptanceRationale: z.string().trim().optional(),
  decisionMaker: z.string().trim().optional(),
  mitigated: z.boolean().optional(),
  accepted: z.boolean().optional(),
});

export type UpdateRiskFormValues = z.infer<typeof updateRiskFormSchema>;
