import { apiRequest } from "@/shared/lib/http";
import type {
  AssetCategory,
  CreateHardwareInput,
  CreateInformationInput,
  CreatePeopleInput,
  CreatePremiseInput,
  CreateSoftwareInput,
  HardwareAsset,
  InformationAsset,
  ListAssetsParams,
  PaginatedAssets,
  PeopleAsset,
  PremiseAsset,
  SoftwareAsset,
  UpdateHardwareInput,
  UpdateInformationInput,
  UpdatePeopleInput,
  UpdatePremiseInput,
  UpdateSoftwareInput,
} from "../types";

function toQuery(params: ListAssetsParams = {}): string {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.pageSize) search.set("pageSize", String(params.pageSize));
  if (params.search) search.set("search", params.search);
  if (params.businessUnitIds?.length) {
    search.set("businessUnitIds", params.businessUnitIds.join(","));
  }
  if (params.ownerIds?.length) {
    search.set("ownerIds", params.ownerIds.join(","));
  }
  if (params.categoryIds?.length) {
    search.set("categoryIds", params.categoryIds.join(","));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function listAssets<T>(
  category: AssetCategory,
  params?: ListAssetsParams
): Promise<PaginatedAssets<T>> {
  return apiRequest<PaginatedAssets<T>>(`/assets/${category}${toQuery(params)}`);
}

export function getAsset<T>(category: AssetCategory, id: string): Promise<T> {
  return apiRequest<T>(`/assets/${category}/${id}`);
}

export function createHardware(
  body: CreateHardwareInput
): Promise<HardwareAsset> {
  return apiRequest<HardwareAsset>("/assets/hardware", {
    method: "POST",
    body,
  });
}

export function updateHardware(
  id: string,
  body: UpdateHardwareInput
): Promise<HardwareAsset> {
  return apiRequest<HardwareAsset>(`/assets/hardware/${id}`, {
    method: "PATCH",
    body,
  });
}

export function deleteHardware(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/assets/hardware/${id}`, {
    method: "DELETE",
  });
}

export function createSoftware(
  body: CreateSoftwareInput
): Promise<SoftwareAsset> {
  return apiRequest<SoftwareAsset>("/assets/software", {
    method: "POST",
    body,
  });
}

export function updateSoftware(
  id: string,
  body: UpdateSoftwareInput
): Promise<SoftwareAsset> {
  return apiRequest<SoftwareAsset>(`/assets/software/${id}`, {
    method: "PATCH",
    body,
  });
}

export function deleteSoftware(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/assets/software/${id}`, {
    method: "DELETE",
  });
}

export function addSoftwareKey(
  id: string,
  value: string
): Promise<SoftwareAsset> {
  return apiRequest<SoftwareAsset>(`/assets/software/${id}/keys`, {
    method: "POST",
    body: { value },
  });
}

export function removeSoftwareKey(
  id: string,
  keyId: string
): Promise<SoftwareAsset> {
  return apiRequest<SoftwareAsset>(`/assets/software/${id}/keys/${keyId}`, {
    method: "DELETE",
  });
}

export function addSoftwareDocument(
  id: string,
  document: {
    fileName: string;
    mimeType?: string;
    sizeBytes?: number;
    storageKey?: string;
  }
): Promise<SoftwareAsset> {
  return apiRequest<SoftwareAsset>(`/assets/software/${id}/documents`, {
    method: "POST",
    body: document,
  });
}

export function removeSoftwareDocument(
  id: string,
  documentId: string
): Promise<SoftwareAsset> {
  return apiRequest<SoftwareAsset>(
    `/assets/software/${id}/documents/${documentId}`,
    { method: "DELETE" }
  );
}

export function createPeople(body: CreatePeopleInput): Promise<PeopleAsset> {
  return apiRequest<PeopleAsset>("/assets/people", {
    method: "POST",
    body,
  });
}

export function updatePeople(
  id: string,
  body: UpdatePeopleInput
): Promise<PeopleAsset> {
  return apiRequest<PeopleAsset>(`/assets/people/${id}`, {
    method: "PATCH",
    body,
  });
}

export function deletePeople(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/assets/people/${id}`, {
    method: "DELETE",
  });
}

export function createPremise(
  body: CreatePremiseInput
): Promise<PremiseAsset> {
  return apiRequest<PremiseAsset>("/assets/premise", {
    method: "POST",
    body,
  });
}

export function updatePremise(
  id: string,
  body: UpdatePremiseInput
): Promise<PremiseAsset> {
  return apiRequest<PremiseAsset>(`/assets/premise/${id}`, {
    method: "PATCH",
    body,
  });
}

export function deletePremise(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/assets/premise/${id}`, {
    method: "DELETE",
  });
}

export function createInformation(
  body: CreateInformationInput
): Promise<InformationAsset> {
  return apiRequest<InformationAsset>("/assets/information", {
    method: "POST",
    body,
  });
}

export function updateInformation(
  id: string,
  body: UpdateInformationInput
): Promise<InformationAsset> {
  return apiRequest<InformationAsset>(`/assets/information/${id}`, {
    method: "PATCH",
    body,
  });
}

export function deleteInformation(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/assets/information/${id}`, {
    method: "DELETE",
  });
}

export function deleteAsset(
  category: AssetCategory,
  id: string
): Promise<{ message: string }> {
  switch (category) {
    case "hardware":
      return deleteHardware(id);
    case "software":
      return deleteSoftware(id);
    case "people":
      return deletePeople(id);
    case "premise":
      return deletePremise(id);
    case "information":
      return deleteInformation(id);
  }
}
