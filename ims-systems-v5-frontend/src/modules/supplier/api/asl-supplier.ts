import { apiBlobRequest, apiRequest } from "@/shared/lib/http";
import type {
  AslNotifyResult,
  AslOverview,
  AslPublicSnapshot,
  AslSettings,
  AslShareResult,
  AslSupplier,
  AslUploadContext,
  CreateAslEvaluationInput,
  CreateAslSupplierInput,
  ListAslSuppliersParams,
  PaginatedAslSuppliers,
  PublicAslUploadInput,
  UpdateAslSettingsInput,
  UpdateAslSupplierInput,
  UpsertAslDocumentInput,
} from "../types";

function toQuery(params: ListAslSuppliersParams = {}): string {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.pageSize) search.set("pageSize", String(params.pageSize));
  if (params.search) search.set("search", params.search);
  if (params.crit) search.set("crit", params.crit);
  if (params.status) search.set("status", params.status);
  if (params.issue !== undefined) search.set("issue", String(params.issue));
  if (params.includeRemoved !== undefined) {
    search.set("includeRemoved", String(params.includeRemoved));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function listAslSuppliers(
  params?: ListAslSuppliersParams
): Promise<PaginatedAslSuppliers> {
  return apiRequest<PaginatedAslSuppliers>(`/supplier${toQuery(params)}`);
}

export function getAslOverview(): Promise<AslOverview> {
  return apiRequest<AslOverview>("/supplier/overview");
}

export function getAslSupplier(id: string): Promise<AslSupplier> {
  return apiRequest<AslSupplier>(`/supplier/${id}`);
}

export function createAslSupplier(
  body: CreateAslSupplierInput
): Promise<AslSupplier> {
  return apiRequest<AslSupplier>("/supplier", { method: "POST", body });
}

export function updateAslSupplier(
  id: string,
  body: UpdateAslSupplierInput
): Promise<AslSupplier> {
  return apiRequest<AslSupplier>(`/supplier/${id}`, {
    method: "PATCH",
    body,
  });
}

export function addAslDocument(
  id: string,
  body: UpsertAslDocumentInput
): Promise<AslSupplier> {
  return apiRequest<AslSupplier>(`/supplier/${id}/documents`, {
    method: "POST",
    body,
  });
}

export function updateAslDocument(
  id: string,
  docId: string,
  body: UpsertAslDocumentInput
): Promise<AslSupplier> {
  return apiRequest<AslSupplier>(`/supplier/${id}/documents/${docId}`, {
    method: "PATCH",
    body,
  });
}

export function deleteAslDocument(
  id: string,
  docId: string
): Promise<AslSupplier> {
  return apiRequest<AslSupplier>(`/supplier/${id}/documents/${docId}`, {
    method: "DELETE",
  });
}

export function addAslEvaluation(
  id: string,
  body: CreateAslEvaluationInput
): Promise<AslSupplier> {
  return apiRequest<AslSupplier>(`/supplier/${id}/evaluations`, {
    method: "POST",
    body,
  });
}

export function notifyAslSuppliers(
  ids: string[]
): Promise<AslNotifyResult[]> {
  return apiRequest<AslNotifyResult[]>("/supplier/notify", {
    method: "POST",
    body: { ids },
  });
}

export function getAslSettings(): Promise<AslSettings> {
  return apiRequest<AslSettings>("/supplier/settings");
}

export function updateAslSettings(
  body: UpdateAslSettingsInput
): Promise<AslSettings> {
  return apiRequest<AslSettings>("/supplier/settings", {
    method: "PUT",
    body,
  });
}

export function shareAslPack(expiresInDays = 30): Promise<AslShareResult> {
  return apiRequest<AslShareResult>("/supplier/share", {
    method: "POST",
    body: { expiresInDays },
  });
}

export function getAslPublicSnapshot(
  token: string
): Promise<AslPublicSnapshot> {
  return apiRequest<AslPublicSnapshot>(
    `/supplier/public/${encodeURIComponent(token)}`
  );
}

export function getAslUploadContext(
  token: string
): Promise<AslUploadContext> {
  return apiRequest<AslUploadContext>(
    `/supplier/upload/${encodeURIComponent(token)}`
  );
}

export function publicAslUpload(
  token: string,
  body: PublicAslUploadInput
): Promise<AslSupplier> {
  return apiRequest<AslSupplier>(
    `/supplier/upload/${encodeURIComponent(token)}`,
    { method: "POST", body }
  );
}

export function preparePublicAslUpload(
  token: string,
  body: { fileName: string; contentType?: string; fileSize?: number }
): Promise<{ url: string; storageInfo: import("../types").AslFileMeta }> {
  return apiRequest(`/supplier/upload/${encodeURIComponent(token)}/prepare`, {
    method: "POST",
    body,
  });
}

/** Upload a file for a public ASL token (no session File Handler). */
export async function uploadViaPublicAslToken(
  token: string,
  file: File
): Promise<import("../types").AslFileMeta> {
  const prepared = await preparePublicAslUpload(token, {
    fileName: file.name,
    contentType: file.type || undefined,
    fileSize: file.size,
  });
  if (!prepared.url.startsWith("memory://")) {
    const response = await fetch(prepared.url, {
      method: "PUT",
      body: file,
      headers: {
        ...(file.type ? { "Content-Type": file.type } : {}),
      },
    });
    if (!response.ok) {
      throw new Error(`Upload failed (${response.status})`);
    }
  }
  return {
    ...prepared.storageInfo,
    Size: file.size,
  };
}

export async function downloadAslCsv(): Promise<void> {
  const blob = await apiBlobRequest("/supplier/export.csv", {
    accept: "text/csv",
  });
  triggerDownload(blob, "approved-supplier-list.csv");
}

export async function downloadAslAuditorPack(
  format: "html" | "pdf"
): Promise<Blob> {
  return apiBlobRequest(`/supplier/auditor-pack?format=${format}`, {
    accept: format === "pdf" ? "application/pdf" : "text/html",
  });
}

export async function downloadAslAuditorPackFile(
  format: "html" | "pdf"
): Promise<void> {
  if (format === "pdf") {
    const { downloadHtmlDocumentAsPdf } = await import(
      "@/shared/lib/download-html-pdf"
    );
    const blob = await downloadAslAuditorPack("html");
    const html = await blob.text();
    await downloadHtmlDocumentAsPdf(html, "asl-auditor-pack.pdf");
    return;
  }
  const blob = await downloadAslAuditorPack("html");
  triggerDownload(blob, "asl-auditor-pack.html");
}
