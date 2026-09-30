import { apiRequest } from "@/shared/lib/http";
import type {
  AttachmentInput,
  CreateSupplierInput,
  ListSuppliersParams,
  PaginatedSuppliers,
  Supplier,
  SupplierStats,
  UpdateSupplierInput,
} from "../types";

function toQuery(params: ListSuppliersParams = {}): string {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.pageSize) search.set("pageSize", String(params.pageSize));
  if (params.search) search.set("search", params.search);
  if (params.businessUnitIds?.length) {
    search.set("businessUnitIds", params.businessUnitIds.join(","));
  }
  if (params.createdByIds?.length) {
    search.set("createdByIds", params.createdByIds.join(","));
  }
  if (params.buyerIds?.length) {
    search.set("buyerIds", params.buyerIds.join(","));
  }
  if (params.isCompliant !== undefined) {
    search.set("isCompliant", String(params.isCompliant));
  }
  if (params.sort) search.set("sort", params.sort);
  if (params.sortDir) search.set("sortDir", params.sortDir);
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function listSuppliers(
  params?: ListSuppliersParams
): Promise<PaginatedSuppliers> {
  return apiRequest<PaginatedSuppliers>(`/suppliers${toQuery(params)}`);
}

export function getSupplier(id: string): Promise<Supplier> {
  return apiRequest<Supplier>(`/suppliers/${id}`);
}

export function getSupplierStats(): Promise<SupplierStats> {
  return apiRequest<SupplierStats>("/suppliers/stats");
}

export function createSupplier(body: CreateSupplierInput): Promise<Supplier> {
  return apiRequest<Supplier>("/suppliers", { method: "POST", body });
}

export function updateSupplier(
  id: string,
  body: UpdateSupplierInput
): Promise<Supplier> {
  return apiRequest<Supplier>(`/suppliers/${id}`, { method: "PATCH", body });
}

export function deleteSupplier(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/suppliers/${id}`, {
    method: "DELETE",
  });
}

export function addSupplierSlaFiles(
  id: string,
  files: AttachmentInput[]
): Promise<Supplier> {
  return apiRequest<Supplier>(`/suppliers/${id}/slas`, {
    method: "POST",
    body: { files },
  });
}

export function removeSupplierSlaFile(
  id: string,
  fileId: string
): Promise<Supplier> {
  return apiRequest<Supplier>(`/suppliers/${id}/slas/${fileId}`, {
    method: "DELETE",
  });
}

export function addSupplierContractFiles(
  id: string,
  files: AttachmentInput[]
): Promise<Supplier> {
  return apiRequest<Supplier>(`/suppliers/${id}/contracts`, {
    method: "POST",
    body: { files },
  });
}

export function removeSupplierContractFile(
  id: string,
  fileId: string
): Promise<Supplier> {
  return apiRequest<Supplier>(`/suppliers/${id}/contracts/${fileId}`, {
    method: "DELETE",
  });
}

export function addSupplierOnboardingFiles(
  id: string,
  files: AttachmentInput[]
): Promise<Supplier> {
  return apiRequest<Supplier>(`/suppliers/${id}/onboarding-files`, {
    method: "POST",
    body: { files },
  });
}

export function removeSupplierOnboardingFile(
  id: string,
  fileId: string
): Promise<Supplier> {
  return apiRequest<Supplier>(`/suppliers/${id}/onboarding-files/${fileId}`, {
    method: "DELETE",
  });
}

export function addSupplierKpiObjective(
  id: string,
  value: string
): Promise<Supplier> {
  return apiRequest<Supplier>(`/suppliers/${id}/kpi-objectives`, {
    method: "POST",
    body: { value },
  });
}

export function removeSupplierKpiObjective(
  id: string,
  kpiId: string
): Promise<Supplier> {
  return apiRequest<Supplier>(`/suppliers/${id}/kpi-objectives/${kpiId}`, {
    method: "DELETE",
  });
}

export type { AttachmentInput };
