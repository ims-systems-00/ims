import { z } from "zod";
import { REPORT_BUG_CATEGORIES } from "../types";

export const submitReportBugBodySchema = z.object({
  category: z.enum(REPORT_BUG_CATEGORIES),
  title: z.string().trim().min(8, "Title must be at least 8 characters").max(200),
  description: z
    .string()
    .trim()
    .min(1, "Description is required")
    .max(10_000),
});
