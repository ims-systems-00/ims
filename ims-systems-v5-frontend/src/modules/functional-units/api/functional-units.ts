import { apiRequest } from "@/shared/lib/http";
import type {
  CreateFunctionalUnitInput,
  FunctionalUnit,
  ListFunctionalUnitsParams,
  PaginatedFunctionalUnits,
  UnitMember,
  UnitMembersResponse,
  UpdateFunctionalUnitInput,
} from "../types";

function toQuery(params: ListFunctionalUnitsParams = {}): string {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.pageSize) search.set("pageSize", String(params.pageSize));
  if (params.search) search.set("search", params.search);
  if (params.accessType) search.set("accessType", params.accessType);
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function listFunctionalUnits(
  params?: ListFunctionalUnitsParams
): Promise<PaginatedFunctionalUnits> {
  return apiRequest<PaginatedFunctionalUnits>(
    `/functional-units${toQuery(params)}`
  );
}

export function getFunctionalUnit(id: string): Promise<FunctionalUnit> {
  return apiRequest<FunctionalUnit>(`/functional-units/${id}`);
}

export function createFunctionalUnit(
  body: CreateFunctionalUnitInput
): Promise<FunctionalUnit> {
  return apiRequest<FunctionalUnit>("/functional-units", {
    method: "POST",
    body,
  });
}

export function updateFunctionalUnit(
  id: string,
  body: UpdateFunctionalUnitInput
): Promise<FunctionalUnit> {
  return apiRequest<FunctionalUnit>(`/functional-units/${id}`, {
    method: "PATCH",
    body,
  });
}

export function deleteFunctionalUnit(
  id: string
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/functional-units/${id}`, {
    method: "DELETE",
  });
}

export function listFunctionalUnitMembers(
  unitId: string
): Promise<UnitMembersResponse> {
  return apiRequest<UnitMembersResponse>(
    `/functional-units/${unitId}/members`
  );
}

export function listEligibleFunctionalUnitMembers(
  unitId: string,
  search?: string
): Promise<UnitMembersResponse> {
  const qs = search ? `?search=${encodeURIComponent(search)}` : "";
  return apiRequest<UnitMembersResponse>(
    `/functional-units/${unitId}/members/eligible${qs}`
  );
}

export function addFunctionalUnitMembers(
  unitId: string,
  userIds: string[]
): Promise<{
  message: string;
  members: UnitMember[];
  unit: FunctionalUnit;
}> {
  return apiRequest(`/functional-units/${unitId}/members`, {
    method: "POST",
    body: { userIds },
  });
}

export function removeFunctionalUnitMember(
  unitId: string,
  userId: string
): Promise<{ message: string; unit: FunctionalUnit }> {
  return apiRequest(`/functional-units/${unitId}/members/${userId}`, {
    method: "DELETE",
  });
}
