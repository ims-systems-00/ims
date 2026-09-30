import { z } from "zod";
import {
  CALENDAR_EVENT_COLORS,
  CALENDAR_EVENT_REFERENCES,
} from "../types";

const objectIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, "Invalid id format");

const dateInputSchema = z.coerce.date();

const csvList = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined;
    const parts = Array.isArray(value)
      ? value
      : value.split(",").map((part) => part.trim());
    return parts.filter((part) => part.length > 0);
  });

const booleanQuery = z
  .union([z.boolean(), z.enum(["true", "false", "1", "0"])])
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined;
    if (typeof value === "boolean") return value;
    return value === "true" || value === "1";
  });

const colorSchema = z.enum(CALENDAR_EVENT_COLORS);
const eventReferenceSchema = z.enum(CALENDAR_EVENT_REFERENCES);

function refineStartEnd(
  value: { start?: Date; end?: Date },
  ctx: z.RefinementCtx
): void {
  if (value.start && value.end && value.end.getTime() < value.start.getTime()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["end"],
      message: "End must be on or after start",
    });
  }
}

export const createCalendarEventBodySchema = z
  .object({
    title: z.string().trim().min(1, "Title is required"),
    start: dateInputSchema,
    end: dateInputSchema,
    description: z.string().trim().optional(),
    color: colorSchema.optional(),
  })
  .superRefine(refineStartEnd);

export const updateCalendarEventBodySchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    start: dateInputSchema.optional(),
    end: dateInputSchema.optional(),
    description: z.string().trim().optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one field must be provided"
  )
  .superRefine(refineStartEnd);

export const listCalendarEventsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  /** Calendar UI may load a full month; allow a higher cap than typical list pages. */
  pageSize: z.coerce.number().int().positive().max(500).default(100),
  search: z.string().trim().optional(),
  from: dateInputSchema.optional(),
  to: dateInputSchema.optional(),
  eventReferences: csvList.pipe(z.array(eventReferenceSchema).optional()),
  colors: csvList.pipe(z.array(colorSchema).optional()),
  standaloneOnly: booleanQuery,
  sort: z
    .enum(["start", "end", "createdOn", "title", "updatedAt"])
    .default("start"),
  sortDir: z.enum(["asc", "desc"]).default("asc"),
});

export const idParamSchema = z.object({
  id: objectIdSchema,
});
