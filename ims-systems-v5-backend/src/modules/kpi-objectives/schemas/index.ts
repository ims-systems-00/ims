import { z } from "zod";
import {
  KPI_MODULE_TYPES,
  KPI_PRIVACY,
  MAX_KPI_UNIT_LENGTH,
  MAX_KPI_VALUE_LENGTH,
} from "../types";

const objectIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, "Invalid id format");

export const createKpiObjectiveBodySchema = z
  .object({
    value: z
      .string()
      .trim()
      .min(1, "KPI/Objective value is required")
      .max(MAX_KPI_VALUE_LENGTH),
    privacy: z.enum(KPI_PRIVACY).default("Organisational"),
    businessUnitId: objectIdSchema.nullable().optional(),
    targetValue: z.number().min(0).optional(),
    unit: z.string().trim().max(MAX_KPI_UNIT_LENGTH).optional(),
    moduleType: z.enum(KPI_MODULE_TYPES).optional(),
    moduleId: objectIdSchema.nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.privacy === "Business unit" && !value.businessUnitId) {
      ctx.addIssue({
        code: "custom",
        path: ["businessUnitId"],
        message: "businessUnitId is required when privacy is Business unit",
      });
    }
    if (value.privacy === "Organisational" && value.businessUnitId) {
      ctx.addIssue({
        code: "custom",
        path: ["businessUnitId"],
        message: "businessUnitId must be omitted for Organisational privacy",
      });
    }
  });

export const updateKpiObjectiveBodySchema = z
  .object({
    value: z
      .string()
      .trim()
      .min(1)
      .max(MAX_KPI_VALUE_LENGTH)
      .optional(),
    privacy: z.enum(KPI_PRIVACY).optional(),
    businessUnitId: objectIdSchema.nullable().optional(),
    targetValue: z.number().min(0).optional(),
    currentValue: z.number().min(0).optional(),
    unit: z.string().trim().max(MAX_KPI_UNIT_LENGTH).optional(),
    moduleType: z.enum(KPI_MODULE_TYPES).nullable().optional(),
    moduleId: objectIdSchema.nullable().optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one field must be provided"
  );

export const listKpiObjectivesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(50),
  search: z.string().trim().optional(),
  privacy: z.enum(KPI_PRIVACY).optional(),
  businessUnitId: objectIdSchema.optional(),
  sort: z.enum(["createdOn", "reference", "updatedAt"]).default("createdOn"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

export const idParamSchema = z.object({
  id: objectIdSchema,
});
