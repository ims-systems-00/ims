import { z } from "zod";
import { TASK_PRIORITIES } from "./types";

const objectIdSchema = z
  .string()
  .trim()
  .regex(/^[a-fA-F0-9]{24}$/, "Invalid id format");

const subjectIdSchema = z.string().trim().min(1, "Invalid user id");

const optionalObjectId = z
  .string()
  .trim()
  .optional()
  .refine(
    (value) => !value || /^[a-fA-F0-9]{24}$/.test(value),
    "Must be a valid 24-character id"
  )
  .transform((value) => (value && value.length > 0 ? value : undefined));

const attachmentInputSchema = z.object({
  fileName: z.string().trim().min(1, "File name is required"),
  mimeType: z.string().trim().optional(),
  sizeBytes: z.number().int().nonnegative().optional(),
  storageKey: z.string().trim().optional(),
  url: z
    .string()
    .trim()
    .url("Must be a valid URL")
    .optional()
    .or(z.literal("")),
});

/**
 * Create form: UI requires description and due date (spec); backend treats them optional.
 */
export const createTaskFormSchema = z
  .object({
    name: z.string().trim().min(1, "Task name is required"),
    description: z.string().trim().min(1, "Description is required"),
    dueDate: z.string().trim().min(1, "Due date is required"),
    priority: z.enum(TASK_PRIORITIES),
    teamPriority: z.boolean(),
    businessUnitId: optionalObjectId,
    assigneeIds: z.array(subjectIdSchema).default([]),
    attachments: z.array(attachmentInputSchema).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.teamPriority && !value.businessUnitId) {
      ctx.addIssue({
        code: "custom",
        path: ["businessUnitId"],
        message: "Business unit is required for team tasks",
      });
    }
    if (!value.teamPriority && value.assigneeIds.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["assigneeIds"],
        message: "Select at least one assignee",
      });
    }
  });

export type CreateTaskFormValues = z.infer<typeof createTaskFormSchema>;

export const updateTaskFormSchema = z
  .object({
    name: z.string().trim().min(1, "Task name is required"),
    description: z.string().trim().min(1, "Description is required"),
    dueDate: z.string().trim().min(1, "Due date is required"),
    priority: z.enum(TASK_PRIORITIES),
    teamPriority: z.boolean(),
    businessUnitId: optionalObjectId,
    assigneeIds: z.array(subjectIdSchema).default([]),
    attachments: z.array(attachmentInputSchema).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.teamPriority && !value.businessUnitId) {
      ctx.addIssue({
        code: "custom",
        path: ["businessUnitId"],
        message: "Business unit is required for team tasks",
      });
    }
    if (!value.teamPriority && value.assigneeIds.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["assigneeIds"],
        message: "Select at least one assignee",
      });
    }
  });

export type UpdateTaskFormValues = z.infer<typeof updateTaskFormSchema>;

/** Kept for typed route/id helpers if needed by callers. */
export const taskObjectIdSchema = objectIdSchema;
