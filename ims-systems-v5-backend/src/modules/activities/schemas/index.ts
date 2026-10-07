import { z } from "zod";
import {
  ACTIVITY_MODULE_TYPES,
  MAX_ACTIVITY_VALUE_LENGTH,
  MAX_EXTRA_LOGS,
  MAX_EXTRA_LOG_DESCRIPTION_LENGTH,
  MAX_EXTRA_LOG_TITLE_LENGTH,
} from "../types";

const objectIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, "Invalid id format");

const subjectIdSchema = z.string().trim().min(1, "Id is required");

const metaInfoSchema = z
  .record(z.string(), z.unknown())
  .optional()
  .nullable();

export const createActivityBodySchema = z.object({
  moduleType: z.enum(ACTIVITY_MODULE_TYPES),
  moduleId: subjectIdSchema,
  value: z
    .string()
    .trim()
    .min(1, "Comment text is required")
    .max(MAX_ACTIVITY_VALUE_LENGTH),
  metaInfo: metaInfoSchema,
  groupId: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((value) => (value && value.length > 0 ? value : null)),
});

export const updateActivityBodySchema = z.object({
  value: z
    .string()
    .trim()
    .min(1, "Comment text is required")
    .max(MAX_ACTIVITY_VALUE_LENGTH),
});

export const listActivitiesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(20),
  moduleType: z.enum(ACTIVITY_MODULE_TYPES),
  moduleId: subjectIdSchema,
  isAutomated: z
    .enum(["true", "false"])
    .optional()
    .transform((value) =>
      value === undefined ? undefined : value === "true"
    ),
  threadId: z.string().trim().optional(),
  sort: z.enum(["createdOn", "updatedAt"]).default("createdOn"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

export const idParamSchema = z.object({
  id: objectIdSchema,
});

/** Used by automated record helpers / tests — not the public HTTP create body. */
export const extraLogSchema = z.object({
  title: z.string().trim().min(1).max(MAX_EXTRA_LOG_TITLE_LENGTH),
  description: z
    .string()
    .trim()
    .max(MAX_EXTRA_LOG_DESCRIPTION_LENGTH)
    .optional(),
  icon: z.string().trim().optional(),
  image: z.string().trim().optional(),
});

export const extraLogsSchema = z.array(extraLogSchema).max(MAX_EXTRA_LOGS);
