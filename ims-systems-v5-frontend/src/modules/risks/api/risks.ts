import { loadPublicEnv } from "@/shared/lib/env";
import { apiRequest } from "@/shared/lib/http";
import { ApiClientError, mapStatusToCode } from "@/shared/lib/http/errors";
import type {
  CreateRiskInput,
  ListRisksParams,
  PaginatedRisks,
  Risk,
  RiskStats,
  UpdateRiskInput,
} from "../types";

function toQuery(params: ListRisksParams = {}): string {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.pageSize) search.set("pageSize", String(params.pageSize));
  if (params.search) search.set("search", params.search);
  if (params.status) search.set("status", params.status);
  if (params.businessUnitIds?.length) {
    search.set("businessUnitIds", params.businessUnitIds.join(","));
  }
  if (params.ownerIds?.length) {
    search.set("ownerIds", params.ownerIds.join(","));
  }
  if (params.categoryIds?.length) {
    search.set("categoryIds", params.categoryIds.join(","));
  }
  if (params.types?.length) {
    search.set("types", params.types.join(","));
  }
  if (params.raisedFrom) search.set("raisedFrom", params.raisedFrom);
  if (params.raisedTo) search.set("raisedTo", params.raisedTo);
  if (params.sort) search.set("sort", params.sort);
  if (params.sortDir) search.set("sortDir", params.sortDir);
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function listRisks(params?: ListRisksParams): Promise<PaginatedRisks> {
  return apiRequest<PaginatedRisks>(`/risks${toQuery(params)}`);
}

export function getRisk(id: string): Promise<Risk> {
  return apiRequest<Risk>(`/risks/${id}`);
}

export function getRiskStats(): Promise<RiskStats> {
  return apiRequest<RiskStats>("/risks/stats");
}

export function createRisk(body: CreateRiskInput): Promise<Risk> {
  return apiRequest<Risk>("/risks", { method: "POST", body });
}

export function updateRisk(id: string, body: UpdateRiskInput): Promise<Risk> {
  return apiRequest<Risk>(`/risks/${id}`, { method: "PATCH", body });
}

export function deleteRisk(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/risks/${id}`, { method: "DELETE" });
}

export function escalateRisk(id: string): Promise<Risk> {
  return apiRequest<Risk>(`/risks/${id}/escalate`, { method: "POST" });
}

export function nudgeRisk(id: string): Promise<Risk> {
  return apiRequest<Risk>(`/risks/${id}/nudge`, { method: "POST" });
}

export function mitigateRisk(
  id: string,
  body: { mitigationText: string }
): Promise<Risk> {
  return apiRequest<Risk>(`/risks/${id}/mitigate`, { method: "POST", body });
}

export function acceptRisk(
  id: string,
  body: { acceptanceRationale: string; decisionMaker?: string }
): Promise<Risk> {
  return apiRequest<Risk>(`/risks/${id}/accept`, { method: "POST", body });
}

/**
 * CSV report is returned as raw text (not the JSON success envelope).
 */
export async function downloadRisksReport(): Promise<Blob> {
  const env = loadPublicEnv();
  const correlationId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `fe-${Date.now()}`;

  let response: Response;
  try {
    response = await fetch(`${env.VITE_API_BASE_URL}/risks/report`, {
      method: "GET",
      headers: {
        Accept: "text/csv",
        "x-correlation-id": correlationId,
      },
    });
  } catch (error) {
    throw new ApiClientError({
      message: "Network request failed",
      status: 0,
      code: "NETWORK_ERROR",
      details: error instanceof Error ? error.message : undefined,
      correlationId,
    });
  }

  if (!response.ok) {
    throw new ApiClientError({
      message: `Unable to download risks report (${response.status})`,
      status: response.status,
      code: mapStatusToCode(response.status),
      correlationId: response.headers.get("x-correlation-id") ?? correlationId,
    });
  }

  return response.blob();
}
