import { apiRequest } from "@/shared/lib/http";
import type {
  Audit,
  AuditStats,
  CreateAuditInput,
  CreateAuditsResult,
  CreateEmbeddedRiskInput,
  CreateIdentificationInput,
  CreateOfiInput,
  ExtractReportInput,
  ListAuditsParams,
  PaginatedAudits,
  UpdateAuditInput,
  UpdateEmbeddedRiskInput,
  UpdateIdentificationInput,
  UpdateOfiInput,
} from "../types";

function toQuery(params: ListAuditsParams = {}): string {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.pageSize) search.set("pageSize", String(params.pageSize));
  if (params.search) search.set("search", params.search);
  if (params.type) search.set("type", params.type);
  if (params.status) search.set("status", params.status);
  if (params.upcoming !== undefined) {
    search.set("upcoming", String(params.upcoming));
  }
  if (params.businessUnitIds?.length) {
    search.set("businessUnitIds", params.businessUnitIds.join(","));
  }
  if (params.auditorIds?.length) {
    search.set("auditorIds", params.auditorIds.join(","));
  }
  if (params.scheduleBefore) search.set("scheduleBefore", params.scheduleBefore);
  if (params.scheduleFrom) search.set("scheduleFrom", params.scheduleFrom);
  if (params.sort) search.set("sort", params.sort);
  if (params.sortDir) search.set("sortDir", params.sortDir);
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function listAudits(params?: ListAuditsParams): Promise<PaginatedAudits> {
  return apiRequest<PaginatedAudits>(`/audits${toQuery(params)}`);
}

export function getAudit(id: string): Promise<Audit> {
  return apiRequest<Audit>(`/audits/${id}`);
}

export function getAuditStats(type?: string): Promise<AuditStats> {
  const qs = type ? `?type=${encodeURIComponent(type)}` : "";
  return apiRequest<AuditStats>(`/audits/stats${qs}`);
}

export function createAudit(body: CreateAuditInput): Promise<CreateAuditsResult> {
  return apiRequest<CreateAuditsResult>("/audits", { method: "POST", body });
}

export function updateAudit(
  id: string,
  body: UpdateAuditInput
): Promise<Audit> {
  return apiRequest<Audit>(`/audits/${id}`, { method: "PATCH", body });
}

export function deleteAudit(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/audits/${id}`, { method: "DELETE" });
}

export function completeAudit(id: string): Promise<Audit> {
  return apiRequest<Audit>(`/audits/${id}/complete`, { method: "POST" });
}

export function addIdentification(
  id: string,
  body: CreateIdentificationInput
): Promise<Audit> {
  return apiRequest<Audit>(`/audits/${id}/identifications`, {
    method: "POST",
    body,
  });
}

export function updateIdentification(
  id: string,
  identificationId: string,
  body: UpdateIdentificationInput
): Promise<Audit> {
  return apiRequest<Audit>(
    `/audits/${id}/identifications/${identificationId}`,
    { method: "PATCH", body }
  );
}

export function removeIdentification(
  id: string,
  identificationId: string
): Promise<Audit> {
  return apiRequest<Audit>(
    `/audits/${id}/identifications/${identificationId}`,
    { method: "DELETE" }
  );
}

export function addEmbeddedRisk(
  id: string,
  body: CreateEmbeddedRiskInput
): Promise<Audit> {
  return apiRequest<Audit>(`/audits/${id}/risks`, { method: "POST", body });
}

export function updateEmbeddedRisk(
  id: string,
  riskId: string,
  body: UpdateEmbeddedRiskInput
): Promise<Audit> {
  return apiRequest<Audit>(`/audits/${id}/risks/${riskId}`, {
    method: "PATCH",
    body,
  });
}

export function removeEmbeddedRisk(
  id: string,
  riskId: string
): Promise<Audit> {
  return apiRequest<Audit>(`/audits/${id}/risks/${riskId}`, {
    method: "DELETE",
  });
}

export function addOfi(id: string, body: CreateOfiInput): Promise<Audit> {
  return apiRequest<Audit>(`/audits/${id}/ofis`, { method: "POST", body });
}

export function updateOfi(
  id: string,
  ofiId: string,
  body: UpdateOfiInput
): Promise<Audit> {
  return apiRequest<Audit>(`/audits/${id}/ofis/${ofiId}`, {
    method: "PATCH",
    body,
  });
}

export function removeOfi(id: string, ofiId: string): Promise<Audit> {
  return apiRequest<Audit>(`/audits/${id}/ofis/${ofiId}`, {
    method: "DELETE",
  });
}

export function removeAuditAttachment(
  id: string,
  attachmentId: string
): Promise<Audit> {
  return apiRequest<Audit>(`/audits/${id}/attachments/${attachmentId}`, {
    method: "DELETE",
  });
}

export function setAuditComplianceLinks(
  id: string,
  body: { links: Array<{ toolkitId: string; clauseIds: string[] }> }
): Promise<Audit> {
  return apiRequest<Audit>(`/audits/${id}/compliance-links`, {
    method: "PUT",
    body,
  });
}

export function extractAuditReport(
  id: string,
  body: ExtractReportInput
): Promise<{ message: string; audit: Audit }> {
  return apiRequest<{ message: string; audit: Audit }>(
    `/audits/${id}/reports`,
    { method: "POST", body }
  );
}
