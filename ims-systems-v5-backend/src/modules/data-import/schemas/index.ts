import { z } from "zod";
import { IMPORT_DATE_FORMATS, IMPORTABLE_MODULES } from "../types";

export const importableModuleSchema = z.enum(IMPORTABLE_MODULES);

export const importDateFormatSchema = z.enum(IMPORT_DATE_FORMATS);

export const moduleParamSchema = z.object({
  module: importableModuleSchema,
});

export const importSheetBodySchema = z.object({
  module: importableModuleSchema,
  dateFormat: importDateFormatSchema.default("DD/MM/YYYY"),
  /** Optional — accepted for V4 FE compatibility; ignored server-side. */
  format: z.string().optional(),
  dataMap: z
    .record(z.string(), z.string().trim().min(1))
    .refine((value) => Object.keys(value).length > 0, "dataMap is required"),
  dataSet: z
    .array(z.record(z.string(), z.unknown()))
    .min(1, "dataSet must contain at least one row"),
});

export type ImportSheetBody = z.infer<typeof importSheetBodySchema>;
