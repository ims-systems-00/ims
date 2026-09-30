import { apiRequest } from "@/shared/lib/http";
import type {
  AttachmentInput,
  CreateOfiInput,
  ListOfisParams,
  Ofi,
  OfiStats,
  PaginatedOfis,
  UpdateOfiInput,
} from "../types";

function toQuery(params: ListOfisParams = {}): string {
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
  if (params.sourceModuleType) {
    search.set("sourceModuleType", params.sourceModuleType);
  }
  if (params.sourceModuleId) search.set("sourceModuleId", params.sourceModuleId);
  if (params.sort) search.set("sort", params.sort);
  if (params.sortDir) search.set("sortDir", params.sortDir);
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function listOfis(params?: ListOfisParams): Promise<PaginatedOfis> {
  return apiRequest<PaginatedOfis>(`/ofi${toQuery(params)}`);
}

export function getOfi(id: string): Promise<Ofi> {
  return apiRequest<Ofi>(`/ofi/${id}`);
}

export function getOfiStats(): Promise<OfiStats> {
  return apiRequest<OfiStats>("/ofi/stats");
}

export function createOfi(body: CreateOfiInput): Promise<Ofi> {
  return apiRequest<Ofi>("/ofi", { method: "POST", body });
}

export function updateOfi(id: string, body: UpdateOfiInput): Promise<Ofi> {
  return apiRequest<Ofi>(`/ofi/${id}`, { method: "PATCH", body });
}

export function deleteOfi(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/ofi/${id}`, { method: "DELETE" });
}

export function implementOfi(id: string): Promise<Ofi> {
  return apiRequest<Ofi>(`/ofi/${id}/implement`, { method: "POST" });
}

export function addOfiActivity(
  id: string,
  body: { message: string }
): Promise<Ofi> {
  return apiRequest<Ofi>(`/ofi/${id}/activity`, { method: "POST", body });
}

export function nudgeOfi(id: string): Promise<Ofi> {
  return apiRequest<Ofi>(`/ofi/${id}/nudge`, { method: "POST" });
}

export function removeOfiAttachment(
  id: string,
  attachmentId: string
): Promise<Ofi> {
  return apiRequest<Ofi>(`/ofi/${id}/attachments/${attachmentId}`, {
    method: "DELETE",
  });
}

export function setOfiComplianceLinks(
  id: string,
  body: { links: Array<{ toolkitId: string; clauseIds: string[] }> }
): Promise<Ofi> {
  return apiRequest<Ofi>(`/ofi/${id}/compliance-links`, {
    method: "PUT",
    body,
  });
}

export type { AttachmentInput };
