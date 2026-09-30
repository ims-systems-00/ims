import { z } from "zod";
import {
  LIST_STATUS_PRESETS,
  TASK_PRIORITIES,
} from "../types";

const objectIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, "Invalid id format");

/** Security subject / user ids (not always Mongo ObjectIds). */
const subjectIdSchema = z.string().trim().min(1, "Invalid user id");

const attachmentInputSchema = z.object({
  fileName: z.string().trim().min(1, "fileName is required"),
  mimeType: z.string().trim().optional(),
  sizeBytes: z.number().int().nonnegative().optional(),
  storageKey: z.string().trim().optional(),
  url: z.string().trim().url().optional().or(z.literal("")),
});

const sourceSchema = z.object({
  moduleType: z.string().trim().min(1),
  moduleId: z.string().trim().min(1),
});

export const createTaskBodySchema = z
  .object({
    name: z.string().trim().min(1, "Task name is required"),
    description: z.string().trim().optional(),
    dueDate: z.coerce.date().optional(),
    priority: z.enum(TASK_PRIORITIES).optional(),
    teamPriority: z.boolean(),
    businessUnitId: objectIdSchema.optional(),
    assigneeIds: z.array(subjectIdSchema).optional(),
    attachments: z.array(attachmentInputSchema).optional(),
    source: sourceSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.teamPriority && !value.businessUnitId) {
      ctx.addIssue({
        code: "custom",
        path: ["businessUnitId"],
        message: "Business unit is required for team tasks",
      });
    }
  });

export const updateTaskBodySchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    description: z.string().trim().optional(),
    dueDate: z.coerce.date().optional(),
    priority: z.enum(TASK_PRIORITIES).optional(),
    teamPriority: z.boolean().optional(),
    businessUnitId: objectIdSchema.nullable().optional(),
    assigneeIds: z.array(subjectIdSchema).optional(),
    attachments: z.array(attachmentInputSchema).optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one field must be provided"
  );

export const listTasksQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  statusPreset: z.enum(LIST_STATUS_PRESETS).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  assigneeId: subjectIdSchema.optional(),
  dueBefore: z.coerce.date().optional(),
  sourceModuleType: z.string().trim().optional(),
  sourceModuleId: z.string().trim().optional(),
  sort: z
    .enum(["dueDate", "createdOn", "priority", "name", "updatedAt"])
    .default("dueDate"),
  sortDir: z.enum(["asc", "desc"]).default("asc"),
});

export const idParamSchema = z.object({
  id: objectIdSchema,
});

export const attachmentIdParamSchema = z.object({
  id: objectIdSchema,
  attachmentId: z.string().trim().min(1),
});
