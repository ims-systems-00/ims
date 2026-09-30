import { z } from "zod";

const isoDate = z
  .string()
  .trim()
  .refine((value) => !Number.isNaN(Date.parse(value)), "Invalid date");

export const statsDateQuerySchema = z
  .object({
    startDate: isoDate.optional(),
    endDate: isoDate.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.startDate && value.endDate) {
      if (Date.parse(value.startDate) > Date.parse(value.endDate)) {
        ctx.addIssue({
          code: "custom",
          path: ["endDate"],
          message: "endDate must be on or after startDate",
        });
      }
    }
  });

export const statsRiskQuerySchema = z.object({
  months: z.coerce.number().int().positive().max(36).default(12),
});
