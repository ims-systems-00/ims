import { z } from "zod";
import { apiRequest } from "@/shared/lib/http";

export const healthDataSchema = z.object({
  status: z.enum(["ok", "degraded"]),
  checks: z.object({
    database: z.enum(["up", "down"]),
  }),
});

export type HealthData = z.infer<typeof healthDataSchema>;

/**
 * Platform-level health probe against GET /api/v1/health.
 * Not a business module — proves frontend → backend connectivity.
 */
export async function getHealth(signal?: AbortSignal): Promise<HealthData> {
  const data = await apiRequest<unknown>("/health", {
    method: "GET",
    signal,
  });
  return healthDataSchema.parse(data);
}
