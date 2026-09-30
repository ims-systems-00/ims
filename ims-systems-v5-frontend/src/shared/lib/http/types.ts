import { z } from "zod";

export const apiSuccessSchema = z.object({
  success: z.literal(true),
  data: z.unknown(),
  correlationId: z.string().optional(),
});

export const apiErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
  correlationId: z.string().optional(),
});

export type ApiSuccess<T> = {
  success: true;
  data: T;
  correlationId?: string;
};
