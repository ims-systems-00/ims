import { z } from "zod";
import {
  ASL_CATEGORIES,
  ASL_CRITICALITIES,
  ASL_DOC_TYPES,
  ASL_STANDARDS,
  ASL_STATUSES,
} from "./types";

export const createAslSupplierFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  cat: z.enum(ASL_CATEGORIES).or(z.string().trim().min(1)),
  crit: z.enum(ASL_CRITICALITIES),
  contact: z.string().trim().max(200).optional().or(z.literal("")),
  email: z
    .string()
    .trim()
    .email("Valid email is required")
    .optional()
    .or(z.literal("")),
  stds: z
    .array(z.enum(ASL_STANDARDS).or(z.string().trim().min(1).max(80)))
    .max(20)
    .default([]),
  scope: z.string().trim().max(4000).optional().or(z.literal("")),
  reqs: z.string().trim().max(4000).optional().or(z.literal("")),
  evalDue: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
    .nullable()
    .optional()
    .or(z.literal("")),
});

export type CreateAslSupplierFormValues = z.infer<
  typeof createAslSupplierFormSchema
>;

export const updateAslSupplierFormSchema = createAslSupplierFormSchema.extend({
  status: z.enum(ASL_STATUSES).optional(),
  appby: z.string().trim().max(200).optional().or(z.literal("")),
  appon: z.string().trim().nullable().optional(),
});

export type UpdateAslSupplierFormValues = z.infer<
  typeof updateAslSupplierFormSchema
>;

export const aslDocumentFormSchema = z.object({
  type: z.enum(ASL_DOC_TYPES).or(z.string().trim().min(1)),
  exp: z.string().trim().nullable().optional(),
  ref: z.string().trim().max(500).optional().or(z.literal("")),
});

export type AslDocumentFormValues = z.infer<typeof aslDocumentFormSchema>;

export const aslEvaluationFormSchema = z.object({
  scores: z.record(z.string(), z.coerce.number().int().min(1).max(5)),
  note: z.string().trim().max(4000).optional().or(z.literal("")),
});

export type AslEvaluationFormValues = z.infer<typeof aslEvaluationFormSchema>;

export const aslSettingsFormSchema = z
  .object({
    lead: z.coerce.number().int().min(1).max(365),
    follow: z.coerce.number().int().min(1).max(365),
    esc: z.coerce.number().int().min(1).max(365),
    from: z.string().trim().email("Valid From address is required"),
    intervalCritical: z.coerce.number().int().min(1).max(60),
    intervalHigh: z.coerce.number().int().min(1).max(60),
    intervalStandard: z.coerce.number().int().min(1).max(60),
    criteria: z
      .array(
        z.object({
          k: z.string().trim().min(1).max(40),
          n: z.string().trim().min(1).max(200),
          w: z.coerce.number().int().min(0).max(100),
        })
      )
      .min(1)
      .max(20),
  })
  .superRefine((value, ctx) => {
    const total = value.criteria.reduce((sum, c) => sum + c.w, 0);
    if (total !== 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Criteria weights total ${total}%, should be 100`,
        path: ["criteria"],
      });
    }
  });

export type AslSettingsFormValues = z.infer<typeof aslSettingsFormSchema>;

export const publicUploadFormSchema = z.object({
  type: z.string().trim().min(1, "Document type is required"),
  exp: z.string().trim().min(1, "Expiry date is required"),
  ref: z.string().trim().max(500).optional().or(z.literal("")),
});

export type PublicUploadFormValues = z.infer<typeof publicUploadFormSchema>;
