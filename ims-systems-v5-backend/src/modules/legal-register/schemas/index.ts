import { z } from "zod";

const text = (max: number) => z.string().trim().min(1).max(max);

export const createLegalDutyBodySchema = z.object({
  name: text(200),
  legislation: text(200),
  reference: z.string().trim().max(100).optional(),
  appliesTo: z.string().trim().max(300).optional(),
});

export const updateLegalDutyBodySchema = z
  .object({
    name: text(200).optional(),
    legislation: text(200).optional(),
    reference: z.string().trim().max(100).nullable().optional(),
    appliesTo: z.string().trim().max(300).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field must be provided");

export const addEvidenceBodySchema = z.object({
  label: text(300),
  url: z.string().trim().url().max(1000).optional(),
});

export const settingsBodySchema = z.object({
  reviewIntervalMonths: z.number().int().min(1).max(36),
});

export const dutyIdParamSchema = z.object({
  id: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid id format"),
});

export const evidenceParamSchema = dutyIdParamSchema.extend({
  evidenceId: z.string().trim().min(1),
});
