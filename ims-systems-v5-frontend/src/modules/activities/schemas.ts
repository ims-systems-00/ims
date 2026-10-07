import { z } from "zod";
import { MAX_ACTIVITY_VALUE_LENGTH } from "./types";

export const createActivityFormSchema = z.object({
  value: z
    .string()
    .trim()
    .min(1, "Comment text is required")
    .max(MAX_ACTIVITY_VALUE_LENGTH, "Comment text is too long"),
});

export const updateActivityFormSchema = createActivityFormSchema;

export type ActivityFormValues = z.infer<typeof createActivityFormSchema>;
