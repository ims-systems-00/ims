import { z } from "zod";

const isoDateOptional = z
  .string()
  .trim()
  .refine((value) => !Number.isNaN(Date.parse(value)), "Invalid date")
  .optional();

/**
 * Optional date window for future period-scoped live stats.
 * Phase 1 service accepts but does not yet apply these (module stats APIs
 * do not expose reporting-period filters).
 */
export const liveDashboardQuerySchema = z
  .object({
    from: isoDateOptional,
    to: isoDateOptional,
  })
  .superRefine((value, ctx) => {
    if (value.from && value.to) {
      const from = Date.parse(value.from);
      const to = Date.parse(value.to);
      if (from > to) {
        ctx.addIssue({
          code: "custom",
          path: ["to"],
          message: "to must be on or after from",
        });
      }
    }
  });

export const functionalUnitIdParamSchema = z.object({
  id: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid id format"),
});
