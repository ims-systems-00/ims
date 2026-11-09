import { z } from "zod";
import { isActivityValueEmpty } from "./lib/activity-html";
import { MAX_ACTIVITY_VALUE_LENGTH } from "./types";

export const createActivityFormSchema = z.object({
  value: z
    .string()
    .max(MAX_ACTIVITY_VALUE_LENGTH, "Comment text is too long")
    .refine((value) => !isActivityValueEmpty(value), {
      message: "Comment text is required",
    }),
});

export const updateActivityFormSchema = createActivityFormSchema;

export type ActivityFormValues = z.infer<typeof createActivityFormSchema>;
