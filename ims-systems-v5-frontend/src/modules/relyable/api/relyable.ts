import { apiRequest } from "@/shared/lib/http";
import type { RelyableDashboard, RelyableSyncResult } from "../types";

export function getRelyableDashboard(): Promise<RelyableDashboard> {
  return apiRequest<RelyableDashboard>("/relyable/dashboard");
}

export function syncRelyable(): Promise<RelyableSyncResult> {
  return apiRequest<RelyableSyncResult>("/relyable/sync", { method: "POST" });
}
