import { z } from "zod";
import {
  CHART_DISPLAY_TYPES,
  CHART_GROUP_BY_DIMENSIONS,
  CHART_OPERATIONS,
  CHART_SOURCE_MODULES,
  MAX_CHART_DESCRIPTION_LENGTH,
  MAX_CHART_FILTER_VALUES,
  MAX_CHART_GROUP_BY,
  MAX_CHART_NAME_LENGTH,
  MAX_METRIC_FIELD_LENGTH,
} from "../types";

const objectIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, "Invalid id format");

const derivationSchema = z
  .object({
    sourceModule: z.enum(CHART_SOURCE_MODULES),
    operation: z.enum(CHART_OPERATIONS),
    groupBy: z
      .array(z.enum(CHART_GROUP_BY_DIMENSIONS))
      .max(MAX_CHART_GROUP_BY)
      .optional(),
    metricField: z
      .string()
      .trim()
      .min(1)
      .max(MAX_METRIC_FIELD_LENGTH)
      .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, "metricField must be a simple field name")
      .optional(),
    filters: z
      .object({
        statuses: z
          .array(z.string().trim().min(1).max(64))
          .max(MAX_CHART_FILTER_VALUES)
          .optional(),
      })
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (value.operation === "sum" && !value.metricField) {
      ctx.addIssue({
        code: "custom",
        path: ["metricField"],
        message: "metricField is required when operation is sum",
      });
    }
    if (value.operation === "group-count" && (!value.groupBy || value.groupBy.length === 0)) {
      ctx.addIssue({
        code: "custom",
        path: ["groupBy"],
        message: "groupBy is required when operation is group-count",
      });
    }
  });

const configSchema = z.object({
  chartType: z.enum(CHART_DISPLAY_TYPES).optional(),
  title: z.string().trim().max(MAX_CHART_NAME_LENGTH).optional(),
});

export const createChartBodySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(MAX_CHART_NAME_LENGTH),
  description: z
    .string()
    .trim()
    .min(1, "Description is required")
    .max(MAX_CHART_DESCRIPTION_LENGTH),
  derivation: derivationSchema,
  moduleType: z.enum(CHART_SOURCE_MODULES).optional(),
  moduleId: objectIdSchema.optional(),
  config: configSchema.optional(),
});

export const updateChartBodySchema = z
  .object({
    description: z
      .string()
      .trim()
      .min(1)
      .max(MAX_CHART_DESCRIPTION_LENGTH)
      .optional(),
    derivation: derivationSchema.optional(),
    moduleType: z.enum(CHART_SOURCE_MODULES).nullable().optional(),
    moduleId: objectIdSchema.nullable().optional(),
    config: configSchema.nullable().optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one field must be provided"
  );

export const listChartsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  moduleType: z.enum(CHART_SOURCE_MODULES).optional(),
  sort: z.enum(["createdOn", "name", "updatedAt"]).default("createdOn"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

export const idParamSchema = z.object({
  id: objectIdSchema,
});
