import { z } from "zod";
import { KPI_PRIVACY } from "./types";

const objectIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, "Select a valid business unit");

export const createKpiObjectiveFormSchema = z
  .object({
    value: z
      .string()
      .trim()
      .min(1, "KPI/Objective is required")
      .max(4000, "KPI/Objective is too long"),
    privacy: z.enum(KPI_PRIVACY),
    businessUnitId: z.string().trim().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.privacy === "Business unit") {
      const parsed = objectIdSchema.safeParse(value.businessUnitId ?? "");
      if (!parsed.success) {
        ctx.addIssue({
          code: "custom",
          path: ["businessUnitId"],
          message: "Business unit is required",
        });
      }
    }
  });

export type CreateKpiObjectiveFormValues = z.infer<
  typeof createKpiObjectiveFormSchema
>;

export const updateKpiObjectiveFormSchema = z.object({
  value: z
    .string()
    .trim()
    .min(1, "KPI/Objective is required")
    .max(4000, "KPI/Objective is too long"),
});

export type UpdateKpiObjectiveFormValues = z.infer<
  typeof updateKpiObjectiveFormSchema
>;
