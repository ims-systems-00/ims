import { loadPublicEnv } from "@/shared/lib/env";
import { apiRequest } from "@/shared/lib/http";
import { ApiClientError, mapStatusToCode } from "@/shared/lib/http/errors";
import type {
  CreateIncidentInput,
  Incident,
  IncidentStats,
  ListIncidentsParams,
  PaginatedIncidents,
  UpdateIncidentInput,
} from "../types";

function toQuery(params: ListIncidentsParams = {}): string {
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
  if (params.priorities?.length) {
    search.set("priorities", params.priorities.join(","));
  }
  if (params.raisedFrom) search.set("raisedFrom", params.raisedFrom);
  if (params.raisedTo) search.set("raisedTo", params.raisedTo);
  if (params.sourceModuleType) {
    search.set("sourceModuleType", params.sourceModuleType);
  }
  if (params.sourceModuleId) search.set("sourceModuleId", params.sourceModuleId);
  if (params.sort) search.set("sort", params.sort);
  if (params.sortDir) search.set("sortDir", params.sortDir);
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function listIncidents(
  params?: ListIncidentsParams
): Promise<PaginatedIncidents> {
  return apiRequest<PaginatedIncidents>(`/incidents${toQuery(params)}`);
}

export function getIncident(id: string): Promise<Incident> {
  return apiRequest<Incident>(`/incidents/${id}`);
}

export function getIncidentStats(): Promise<IncidentStats> {
  return apiRequest<IncidentStats>("/incidents/stats");
}

export function createIncident(body: CreateIncidentInput): Promise<Incident> {
  return apiRequest<Incident>("/incidents", { method: "POST", body });
}

export function updateIncident(
  id: string,
  body: UpdateIncidentInput
): Promise<Incident> {
  return apiRequest<Incident>(`/incidents/${id}`, { method: "PATCH", body });
}

export function deleteIncident(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/incidents/${id}`, {
    method: "DELETE",
  });
}

export function resolveIncident(
  id: string,
  body: { resolution: string }
): Promise<Incident> {
  return apiRequest<Incident>(`/incidents/${id}/resolve`, {
    method: "POST",
    body,
  });
}

export function escalateIncident(id: string): Promise<Incident> {
  return apiRequest<Incident>(`/incidents/${id}/escalate`, { method: "POST" });
}

export function nudgeIncident(id: string): Promise<Incident> {
  return apiRequest<Incident>(`/incidents/${id}/nudge`, { method: "POST" });
}

export function removeIncidentAttachment(
  id: string,
  attachmentId: string
): Promise<Incident> {
  return apiRequest<Incident>(
    `/incidents/${id}/attachments/${attachmentId}`,
    { method: "DELETE" }
  );
}

export function setIncidentComplianceLinks(
  id: string,
  body: { links: Array<{ toolkitId: string; clauseIds: string[] }> }
): Promise<Incident> {
  return apiRequest<Incident>(`/incidents/${id}/compliance-links`, {
    method: "PUT",
    body,
  });
}

export async function downloadIncidentsReport(): Promise<Blob> {
  const env = loadPublicEnv();
  const correlationId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `fe-${Date.now()}`;

  let response: Response;
  try {
    response = await fetch(`${env.VITE_API_BASE_URL}/incidents/report`, {
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
      message: `Unable to download incidents report (${response.status})`,
      status: response.status,
      code: mapStatusToCode(response.status),
      correlationId: response.headers.get("x-correlation-id") ?? correlationId,
    });
  }

  return response.blob();
}
