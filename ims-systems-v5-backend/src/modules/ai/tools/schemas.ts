/**
 * Zod validation for Alice chat tool arguments.
 */

import { z } from "zod";

const limitSchema = z.number().int().min(1).max(8).optional().default(6);
const analyticsLimitSchema = z.number().int().min(1).max(25).optional().default(8);

export const listRisksArgsSchema = z.object({
  status: z
    .enum(["Open", "Escalated", "Accepted", "Mitigated"])
    .optional(),
  updatedSinceDays: z.number().int().min(1).max(365).optional(),
  sortBy: z.enum(["raisedOn", "updatedAt", "score"]).optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
  includeClosed: z.boolean().optional(),
  raisedByName: z.string().trim().min(2).max(80).optional(),
  ownerName: z.string().trim().min(2).max(80).optional(),
  /** Vague involvement: match raiser OR owner (and sibling fallbacks). */
  personName: z.string().trim().min(2).max(80).optional(),
  unitName: z.string().trim().min(2).max(80).optional(),
  limit: z.number().int().min(1).max(25).optional().default(6),
});

export const listTasksArgsSchema = z.object({
  priority: z.enum(["High", "Medium", "Low"]).optional(),
  incomplete: z.boolean().optional().default(true),
  overdue: z.boolean().optional(),
  updatedSinceDays: z.number().int().min(1).max(365).optional(),
  assigneeName: z.string().trim().min(2).max(80).optional(),
  unitName: z.string().trim().min(2).max(80).optional(),
  limit: limitSchema,
});

export const listIncidentsArgsSchema = z.object({
  priorityHigh: z.boolean().optional(),
  ownerName: z.string().trim().min(2).max(80).optional(),
  unitName: z.string().trim().min(2).max(80).optional(),
  limit: limitSchema,
});

export const listOfiArgsSchema = z.object({
  ownerName: z.string().trim().min(2).max(80).optional(),
  unitName: z.string().trim().min(2).max(80).optional(),
  limit: limitSchema,
});

export const listLimitOnlySchema = z.object({
  limit: limitSchema,
});

export const resolveDirectoryArgsSchema = z.object({
  query: z.string().trim().min(2).max(80),
  kind: z.enum(["people", "units", "both"]).optional().default("both"),
});

export const listComplianceArgsSchema = z.object({
  selectedOnly: z.boolean().optional().default(true),
  notImplementedOnly: z.boolean().optional().default(true),
  limit: analyticsLimitSchema,
});

export const analyticsRisksArgsSchema = z.object({
  metric: z.enum([
    "oldest_raised",
    "newest_raised",
    "highest_score",
    "counts_by_status",
  ]),
  includeClosed: z.boolean().optional(),
  limit: z.number().int().min(1).max(25).optional().default(3),
});

export const analyticsComplianceArgsSchema = z.object({
  focus: z.enum(["gaps", "lowest_progress", "summary"]).optional().default("gaps"),
  limit: analyticsLimitSchema,
});

export const analyticsOrgHealthArgsSchema = z.object({
  limit: z.number().int().min(1).max(8).optional().default(5),
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
