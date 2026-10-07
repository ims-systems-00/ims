import { z } from "zod";
import { REPORT_BUG_CATEGORIES } from "./types";

export const reportBugFormSchema = z.object({
  category: z.enum(REPORT_BUG_CATEGORIES, {
    message: "Select a category",
  }),
  title: z.string().trim().min(8, "Title must be at least 8 characters").max(200),
  description: z
    .string()
    .trim()
    .min(1, "Description is required")
    .max(10_000),
});

export type ReportBugFormValues = z.infer<typeof reportBugFormSchema>;
