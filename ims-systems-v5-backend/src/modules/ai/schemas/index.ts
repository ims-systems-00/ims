import { z } from "zod";
import { AI_SOURCE_MODULE_TYPES, GPT_MESSAGE_ROLES } from "../types";

const objectIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, "Invalid id format");

const gptMessageSchema = z.object({
  role: z.enum(GPT_MESSAGE_ROLES),
  content: z.string().optional(),
});

const reportSectionSchema = z.object({
  name: z.string().trim().min(1, "Section name is required"),
  description: z.string().optional().nullable(),
  prompt: z.string().trim().min(1, "Section prompt is required"),
  response: z.string().optional().nullable(),
});

const analyserTemplateSchema = z.object({
  dataDisplay: z.string().min(1, "dataDisplay is required"),
  context: z.string().min(1, "context is required"),
  reportStructure: z.array(reportSectionSchema).default([]),
});

export const gptBodySchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  systemInstructions: z.array(gptMessageSchema),
  conversation: z.array(gptMessageSchema),
});

export const createAiResponseBodySchema = z.object({
  moduleType: z.enum(AI_SOURCE_MODULE_TYPES),
  module: objectIdSchema,
  template: analyserTemplateSchema,
});

export const updateAiResponseBodySchema = z.object({
  template: analyserTemplateSchema,
});

/**
 * List filters. Supports V4 nested `source[moduleType]` / `source[module]`
 * as well as flat `moduleType` / `module` / `moduleId`.
 */
export const listAiResponsesQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(20),
    size: z.coerce.number().int().positive().max(100).optional(),
    moduleType: z.enum(AI_SOURCE_MODULE_TYPES).optional(),
    module: objectIdSchema.optional(),
    moduleId: objectIdSchema.optional(),
    sortDir: z.enum(["asc", "desc"]).default("desc"),
    source: z
      .object({
        moduleType: z.enum(AI_SOURCE_MODULE_TYPES).optional(),
        module: objectIdSchema.optional(),
      })
      .optional(),
  })
  .transform((value) => {
    const moduleType = value.moduleType ?? value.source?.moduleType;
    const moduleId =
      value.moduleId ?? value.module ?? value.source?.module;
    return {
      page: value.page,
      pageSize: value.size ?? value.pageSize,
      moduleType,
      moduleId,
      sortDir: value.sortDir,
    };
  });

export const idParamSchema = z.object({
  id: objectIdSchema,
});
