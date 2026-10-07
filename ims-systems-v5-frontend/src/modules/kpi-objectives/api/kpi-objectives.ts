import { apiRequest } from "@/shared/lib/http";
import type {
  CreateKpiObjectiveInput,
  KpiObjective,
  ListKpiObjectivesParams,
  PaginatedKpiObjectives,
  UpdateKpiObjectiveInput,
} from "../types";

function toQuery(params: ListKpiObjectivesParams = {}): string {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.pageSize) search.set("pageSize", String(params.pageSize));
  if (params.search) search.set("search", params.search);
  if (params.privacy) search.set("privacy", params.privacy);
  if (params.businessUnitId) {
    search.set("businessUnitId", params.businessUnitId);
  }
  if (params.sort) search.set("sort", params.sort);
  if (params.sortDir) search.set("sortDir", params.sortDir);
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function listKpiObjectives(
  params?: ListKpiObjectivesParams
): Promise<PaginatedKpiObjectives> {
  return apiRequest<PaginatedKpiObjectives>(
    `/kpi-objectives${toQuery(params)}`
  );
}

export function getKpiObjective(id: string): Promise<KpiObjective> {
  return apiRequest<KpiObjective>(`/kpi-objectives/${id}`);
}

export function createKpiObjective(
  body: CreateKpiObjectiveInput
): Promise<KpiObjective> {
  return apiRequest<KpiObjective>("/kpi-objectives", {
    method: "POST",
    body,
  });
}

export function updateKpiObjective(
  id: string,
  body: UpdateKpiObjectiveInput
): Promise<KpiObjective> {
  return apiRequest<KpiObjective>(`/kpi-objectives/${id}`, {
    method: "PATCH",
    body,
  });
}

export function deleteKpiObjective(id: string): Promise<KpiObjective> {
  return apiRequest<KpiObjective>(`/kpi-objectives/${id}`, {
    method: "DELETE",
  });
}
