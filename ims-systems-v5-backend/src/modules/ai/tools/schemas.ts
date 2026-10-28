/**
 * Zod validation for Alice chat tool arguments.
 */

import { z } from "zod";

const limitSchema = z.number().int().min(1).max(8).optional().default(6);

export const listRisksArgsSchema = z.object({
  status: z
    .enum(["Open", "Escalated", "Accepted", "Mitigated"])
    .optional(),
  updatedSinceDays: z.number().int().min(1).max(365).optional(),
  limit: limitSchema,
});

export const listTasksArgsSchema = z.object({
  priority: z.enum(["High", "Medium", "Low"]).optional(),
  incomplete: z.boolean().optional().default(true),
  overdue: z.boolean().optional(),
  updatedSinceDays: z.number().int().min(1).max(365).optional(),
  limit: limitSchema,
});

export const listIncidentsArgsSchema = z.object({
  priorityHigh: z.boolean().optional(),
  limit: limitSchema,
});

export const listLimitOnlySchema = z.object({
  limit: limitSchema,
});

export const getRecordArgsSchema = z.object({
  module: z.enum([
    "risks",
    "tasks",
    "incidents",
    "audits",
    "documents",
    "ofi",
    "compliance",
  ]),
  id: z.string().min(1),
});

export const searchRecordsArgsSchema = z.object({
  query: z.string().min(2).max(200),
  modules: z
    .array(
      z.enum([
        "risks",
        "tasks",
        "incidents",
        "audits",
        "documents",
        "ofi",
        "compliance",
      ])
    )
    .optional(),
  limit: limitSchema,
});

export const searchDocumentsArgsSchema = z.object({
  query: z.string().min(2).max(200),
  limit: limitSchema,
});

export const getActivitiesArgsSchema = z.object({
  module: z.string().min(1),
  id: z.string().min(1),
  limit: z.number().int().min(1).max(5).optional().default(3),
});

export const proposeCreateTaskArgsSchema = z.object({
  name: z.string().min(1).max(200),
  priority: z.enum(["High", "Medium", "Low"]).optional(),
  dueDate: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

export const proposeCreateOfiArgsSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
});
