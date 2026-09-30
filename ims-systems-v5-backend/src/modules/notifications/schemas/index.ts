import { z } from "zod";
import {
  MAX_NOTIFICATION_MESSAGE_LENGTH,
  NOTIFICATION_REFERENCE_TYPES,
  POPUP_STATUSES,
  READ_STATUSES,
  SENT_STATUSES,
} from "../types";

const objectIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, "Invalid id format");

const subjectIdSchema = z.string().trim().min(1, "Invalid user id");

const booleanQuery = z
  .union([z.boolean(), z.enum(["true", "false", "1", "0"])])
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined;
    if (typeof value === "boolean") return value;
    return value === "true" || value === "1";
  });

export const listNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(10),
  actor: booleanQuery,
  push: booleanQuery,
  sent: z.enum(SENT_STATUSES).optional(),
  read: z.enum(READ_STATUSES).optional(),
  popUp: z.enum(POPUP_STATUSES).optional(),
  referenceType: z.enum(NOTIFICATION_REFERENCE_TYPES).optional(),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

export const idParamSchema = z.object({
  id: objectIdSchema,
});

export const broadcastBodySchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Message is required")
    .max(
      MAX_NOTIFICATION_MESSAGE_LENGTH,
      `Message must be at most ${MAX_NOTIFICATION_MESSAGE_LENGTH} characters`
    ),
  audience: z.enum(["all-users", "heads-of-service"]).optional(),
});

export const markPopupBodySchema = z.object({
  status: z.enum(POPUP_STATUSES).default("read"),
});

export { objectIdSchema, subjectIdSchema };
