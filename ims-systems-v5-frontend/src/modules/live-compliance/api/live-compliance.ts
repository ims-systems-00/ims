import { apiRequest } from "@/shared/lib/http";
import type {
  ActionCentreResponse,
  AdviceList,
  LiveActivity,
  LiveHealthResponse,
  LiveModule,
  LiveStandard,
  ModuleHealthResponse,
} from "../types";

const BASE = "/live-compliance";

export function getLiveHealth(standard?: LiveStandard): Promise<LiveHealthResponse> {
  const qs = standard ? `?standard=${encodeURIComponent(standard)}` : "";
  return apiRequest<LiveHealthResponse>(`${BASE}/health${qs}`);
}

export function getModuleHealth(module: LiveModule): Promise<ModuleHealthResponse> {
  return apiRequest<ModuleHealthResponse>(`${BASE}/modules/${module}`);
}

export function listAdvice(params: { module?: LiveModule; limit?: number } = {}): Promise<AdviceList> {
  const search = new URLSearchParams();
  if (params.module) search.set("module", params.module);
  if (params.limit) search.set("limit", String(params.limit));
  const qs = search.toString();
  return apiRequest<AdviceList>(`${BASE}/advice${qs ? `?${qs}` : ""}`);
}

export function getActionCentre(scope: "mine" | "all" = "mine"): Promise<ActionCentreResponse> {
  return apiRequest<ActionCentreResponse>(`${BASE}/action-centre?scope=${scope}`);
}

export function snoozeAdvice(id: string, days = 7): Promise<{ adviceId: string; snoozedUntil: string }> {
  return apiRequest(`${BASE}/advice/${encodeURIComponent(id)}/snooze`, {
    method: "POST",
    body: { days },
  });
}

export function runAdviceAction(id: string): Promise<{ message: string }> {
  return apiRequest(`${BASE}/advice/${encodeURIComponent(id)}/action`, { method: "POST" });
}

export function listLiveActivity(limit = 6): Promise<LiveActivity[]> {
  return apiRequest<LiveActivity[]>(`${BASE}/activity?limit=${limit}`);
}
