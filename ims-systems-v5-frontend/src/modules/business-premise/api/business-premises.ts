import { apiRequest } from "@/shared/lib/http";
import type {
  BusinessPremise,
  CreateBusinessPremiseInput,
  ListBusinessPremisesParams,
  PaginatedBusinessPremises,
  UpdateBusinessPremiseInput,
} from "../types";

function toQuery(params: ListBusinessPremisesParams = {}): string {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.pageSize) search.set("pageSize", String(params.pageSize));
  if (params.search) search.set("search", params.search);
  if (params.sort) search.set("sort", params.sort);
  if (params.sortDir) search.set("sortDir", params.sortDir);
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function listBusinessPremises(
  params?: ListBusinessPremisesParams
): Promise<PaginatedBusinessPremises> {
  return apiRequest<PaginatedBusinessPremises>(
    `/business-premises${toQuery(params)}`
  );
}

export function getBusinessPremise(id: string): Promise<BusinessPremise> {
  return apiRequest<BusinessPremise>(`/business-premises/${id}`);
}

export function createBusinessPremise(
  body: CreateBusinessPremiseInput
): Promise<BusinessPremise> {
  return apiRequest<BusinessPremise>("/business-premises", {
    method: "POST",
    body,
  });
}

export function updateBusinessPremise(
  id: string,
  body: UpdateBusinessPremiseInput
): Promise<BusinessPremise> {
  return apiRequest<BusinessPremise>(`/business-premises/${id}`, {
    method: "PATCH",
    body,
  });
}

export function deleteBusinessPremise(
  id: string
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/business-premises/${id}`, {
    method: "DELETE",
  });
}
