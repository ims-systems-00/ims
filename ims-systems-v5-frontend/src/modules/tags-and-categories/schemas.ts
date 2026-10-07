import { z } from "zod";
import { FRONTEND_APPLICABLE_MODULES } from "./types";

export const createTagAndCategoryFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  description: z.string().trim().min(1, "Description is required").max(2000),
  applicableModules: z
    .array(z.enum(FRONTEND_APPLICABLE_MODULES))
    .min(1, "Select at least one applicable module"),
});

export type CreateTagAndCategoryFormValues = z.infer<
  typeof createTagAndCategoryFormSchema
>;

export const updateTagAndCategoryFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  description: z.string().trim().min(1, "Description is required").max(2000),
});

export type UpdateTagAndCategoryFormValues = z.infer<
  typeof updateTagAndCategoryFormSchema
>;
