import { z } from "zod";
import { LIVE_MODULES, LIVE_STANDARDS } from "../types";

export const healthQuerySchema = z.object({
  standard: z.enum(LIVE_STANDARDS).optional(),
});

export const moduleParamSchema = z.object({
  module: z.enum(LIVE_MODULES),
});

export const adviceQuerySchema = z.object({
  module: z.enum(LIVE_MODULES).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(3),
});

export const adviceIdParamSchema = z.object({
  id: z.string().trim().min(1).max(200),
});

export const snoozeBodySchema = z
  .object({
    days: z.number().int().min(1).max(90).default(7),
  })
  .default({ days: 7 });

export const journeyStepParamSchema = z.object({ step: z.string().min(1).max(40) });
export const journeyStepBodySchema = z.object({ done: z.boolean().default(true) });

export const actionCentreQuerySchema = z.object({
  scope: z.enum(["mine", "all"]).default("mine"),
});

export const activityQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
