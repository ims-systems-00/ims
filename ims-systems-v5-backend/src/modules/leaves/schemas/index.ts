import { z } from "zod";
import {
  LEAVE_DAY_FRACTIONS,
  LEAVE_DECISIONS,
  LEAVE_STATUSES,
  LEAVE_TYPES,
} from "../types";

const objectIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, "Invalid id format");

const dayFractionSchema = z.coerce
  .number()
  .refine(
    (value) => (LEAVE_DAY_FRACTIONS as readonly number[]).includes(value),
    "Day fraction must be 1, 0.75, 0.5 or 0.25"
  );

export const createLeaveBodySchema = z
  .object({
    type: z.enum(LEAVE_TYPES),
    description: z.string().trim().min(1, "Description is required"),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    startDayFraction: dayFractionSchema.default(1),
    endDayFraction: dayFractionSchema.default(1),
    ongoing: z.boolean().optional(),
    submitImmediately: z.boolean().optional(),
  })
  .refine((value) => value.endDate >= value.startDate, {
    message: "End date must be on or after start date",
    path: ["endDate"],
  });

export const updateLeaveBodySchema = z
  .object({
    type: z.enum(LEAVE_TYPES).optional(),
    description: z.string().trim().min(1).optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    startDayFraction: dayFractionSchema.optional(),
    endDayFraction: dayFractionSchema.optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one field must be provided"
  );

export const evaluateLeaveBodySchema = z.object({
  status: z.enum(LEAVE_DECISIONS),
});

export const listLeavesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  scope: z.enum(["mine", "managed"]).default("mine"),
  status: z.enum(LEAVE_STATUSES).optional(),
  type: z.enum(LEAVE_TYPES).optional(),
  search: z.string().trim().optional(),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

export const holidaysQuerySchema = z.object({
  year: z.coerce.number().int().min(1970).max(2100).optional(),
  countryCode: z
    .string()
    .trim()
    .length(2, "Country code must be 2 letters")
    .transform((value) => value.toUpperCase())
    .optional(),
});

export const idParamSchema = z.object({
  id: objectIdSchema,
});
