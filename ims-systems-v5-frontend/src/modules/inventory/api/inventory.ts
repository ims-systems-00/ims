import { apiBlobRequest, apiRequest, type HttpMethod } from "@/shared/lib/http";
import type {
  ComplianceMapRow,
  ConfirmSightingInput,
  CreateInventoryAssetInput,
  CreateStockItemInput,
  InventoryAsset,
  InventoryCalibrationLab,
  InventoryCategoryDef,
  InventoryMutationResult,
  InventoryOverview,
  InventoryScanSnapshot,
  InventorySettings,
  InventoryStockItem,
  ListInventoryAssetsParams,
  ListScheduleParams,
  MoveLocationInput,
  MoveStageInput,
  PaginatedInventoryAssets,
  RecordCheckInput,
  RecordEachUseInput,
  ReportFaultInput,
  ScheduleRow,
  StockMoveInput,
  UpdateInventoryAssetInput,
  UpdateInventorySettingsInput,
  UpdateStockItemInput,
} from "../types";

function toQuery(
  params: Record<string, string | number | boolean | undefined>
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    search.set(key, String(value));
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

export function listInventoryAssets(
  params: ListInventoryAssetsParams = {}
): Promise<PaginatedInventoryAssets> {
  return apiRequest<PaginatedInventoryAssets>(
    `/inventory/assets${toQuery({
      page: params.page,
      pageSize: params.pageSize,
      search: params.search,
      category: params.category,
      stage: params.stage,
      site: params.site,
      issue: params.issue,
      includeDisposed: params.includeDisposed,
    })}`
  );
}

export function getInventoryOverview(): Promise<InventoryOverview> {
  return apiRequest<InventoryOverview>("/inventory/overview");
}

export function getInventoryCategories(): Promise<InventoryCategoryDef[]> {
  return apiRequest<InventoryCategoryDef[]>("/inventory/categories");
}

export function getInventorySettings(): Promise<InventorySettings> {
  return apiRequest<InventorySettings>("/inventory/settings");
}

export function updateInventorySettings(
  body: UpdateInventorySettingsInput
): Promise<InventorySettings> {
  return apiRequest<InventorySettings>("/inventory/settings", {
    method: "PUT",
    body,
  });
}

export function getInventoryAsset(id: string): Promise<InventoryAsset> {
  return apiRequest<InventoryAsset>(`/inventory/assets/${id}`);
}

export function createInventoryAsset(
  body: CreateInventoryAssetInput
): Promise<InventoryAsset> {
  return apiRequest<InventoryAsset>("/inventory/assets", {
    method: "POST",
    body,
  });
}

export function updateInventoryAsset(
  id: string,
  body: UpdateInventoryAssetInput
): Promise<InventoryAsset> {
  return apiRequest<InventoryAsset>(`/inventory/assets/${id}`, {
    method: "PATCH",
    body,
  });
}

export function moveInventoryStage(
  id: string,
  body: MoveStageInput
): Promise<InventoryAsset> {
  return apiRequest<InventoryAsset>(`/inventory/assets/${id}/stage`, {
    method: "POST",
    body,
  });
}

export function recordInventoryCheck(
  id: string,
  body: RecordCheckInput
): Promise<InventoryMutationResult> {
  return apiRequest<InventoryMutationResult>(`/inventory/assets/${id}/checks`, {
    method: "POST",
    body,
  });
}

export function reportInventoryFault(
  id: string,
  body: ReportFaultInput
): Promise<InventoryMutationResult> {
  return apiRequest<InventoryMutationResult>(`/inventory/assets/${id}/fault`, {
    method: "POST",
    body,
  });
}

export function listInventoryCalibrationLabs(): Promise<
  InventoryCalibrationLab[]
> {
  return apiRequest<InventoryCalibrationLab[]>("/inventory/calibration-labs");
}

export function moveInventoryLocation(
  id: string,
  body: MoveLocationInput
): Promise<InventoryAsset> {
  return apiRequest<InventoryAsset>(`/inventory/assets/${id}/move`, {
    method: "POST",
    body,
  });
}

export function confirmInventorySighting(
  id: string,
  body: ConfirmSightingInput
): Promise<InventoryAsset> {
  return apiRequest<InventoryAsset>(`/inventory/assets/${id}/sighting`, {
    method: "POST",
    body,
  });
}

export function recordInventoryEachUse(
  id: string,
  body: RecordEachUseInput
): Promise<InventoryAsset> {
  return apiRequest<InventoryAsset>(`/inventory/assets/${id}/each-use`, {
    method: "POST",
    body,
  });
}

export function markInventoryLabelled(
  ids: string[]
): Promise<{ updated: number }> {
  return apiRequest<{ updated: number }>("/inventory/assets/mark-labelled", {
    method: "POST",
    body: { ids },
  });
}

export function listInventorySchedule(
  params: ListScheduleParams = {}
): Promise<ScheduleRow[]> {
  return apiRequest<ScheduleRow[]>(
    `/inventory/schedule${toQuery({
      due: params.due,
      checkType: params.checkType,
    })}`
  );
}

export function listInventoryStock(): Promise<InventoryStockItem[]> {
  return apiRequest<InventoryStockItem[]>("/inventory/stock");
}

export function createInventoryStock(
  body: CreateStockItemInput
): Promise<InventoryStockItem> {
  return apiRequest<InventoryStockItem>("/inventory/stock", {
    method: "POST",
    body,
  });
}

export function updateInventoryStock(
  id: string,
  body: UpdateStockItemInput
): Promise<InventoryStockItem> {
  return apiRequest<InventoryStockItem>(`/inventory/stock/${id}`, {
    method: "PATCH",
    body,
  });
}

export function moveInventoryStock(
  id: string,
  body: StockMoveInput
): Promise<InventoryStockItem> {
  return apiRequest<InventoryStockItem>(`/inventory/stock/${id}/move`, {
    method: "POST",
    body,
  });
}

export function getComplianceMap(): Promise<ComplianceMapRow[]> {
  return apiRequest<ComplianceMapRow[]>("/inventory/compliance-map");
}

export async function downloadRegisterCsv(): Promise<void> {
  const blob = await apiBlobRequest("/inventory/export/register.csv");
  triggerDownload(blob, "inventory-register.csv");
}

export async function downloadScheduleCsv(): Promise<void> {
  const blob = await apiBlobRequest("/inventory/export/schedule.csv");
  triggerDownload(blob, "inventory-schedule.csv");
}

export async function downloadFixedAssetsCsv(): Promise<void> {
  const blob = await apiBlobRequest("/inventory/export/fixed-assets.csv");
  triggerDownload(blob, "inventory-fixed-assets.csv");
}

export async function downloadModelJson(): Promise<void> {
  const data = await apiRequest<unknown>("/inventory/export/model.json");
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  triggerDownload(blob, "inventory-model.json");
}

export async function openAuditorPack(): Promise<void> {
  const blob = await apiBlobRequest("/inventory/auditor-pack?format=html", {
    accept: "text/html",
  });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function downloadAuditorPackPdf(): Promise<void> {
  const { downloadHtmlDocumentAsPdf } = await import(
    "@/shared/lib/download-html-pdf"
  );
  const blob = await apiBlobRequest("/inventory/auditor-pack?format=html", {
    accept: "text/html",
  });
  const html = await blob.text();
  await downloadHtmlDocumentAsPdf(html, "inventory-auditor-pack.pdf");
}

const SCAN_NAME_KEY = "ims.inventory.scanName";

export function getStoredScanName(): string {
  try {
    return localStorage.getItem(SCAN_NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setStoredScanName(name: string) {
  try {
    localStorage.setItem(SCAN_NAME_KEY, name.trim());
  } catch {
    /* ignore */
  }
}

async function publicRequest<T>(
  path: string,
  init?: { method?: HttpMethod; body?: unknown; scanName?: string }
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const name = init?.scanName?.trim();
  if (name) headers["X-Scan-Name"] = name;
  // Public calls go through the same API base without requiring auth cookies,
  // but cookies are still sent if present (logged-in scanners).
  return apiRequest<T>(path, {
    method: init?.method,
    body: init?.body,
    headers,
  });
}

export function getPublicScanSnapshot(
  organizationId: string,
  tag: string
): Promise<InventoryScanSnapshot> {
  return publicRequest(
    `/inventory/public/${encodeURIComponent(organizationId)}/assets/by-tag/${encodeURIComponent(tag)}`
  );
}

export function publicScanAction(
  organizationId: string,
  tag: string,
  action: "fault" | "each-use" | "move" | "sighting" | "checks",
  body: Record<string, unknown>,
  scanName: string
): Promise<InventoryScanSnapshot> {
  return publicRequest(
    `/inventory/public/${encodeURIComponent(organizationId)}/assets/by-tag/${encodeURIComponent(tag)}/${action}`,
    { method: "POST", body, scanName }
  );
}
