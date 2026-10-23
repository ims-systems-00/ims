import { apiRequest } from "@/shared/lib/http";
import type {
  ImportableModule,
  ImportSheetPayload,
  ModuleOption,
  SchemaResponse,
  StartImportResponse,
  ValidationResponse,
} from "../types";

export function listImportModules(): Promise<ModuleOption[]> {
  return apiRequest<ModuleOption[]>("/data-import/modules");
}

export function getImportSchema(
  module: ImportableModule
): Promise<SchemaResponse> {
  return apiRequest<SchemaResponse>(
    `/data-import/schema/${encodeURIComponent(module)}`
  );
}

export function validateImportSheet(
  body: ImportSheetPayload
): Promise<ValidationResponse> {
  return apiRequest<ValidationResponse>("/data-import/validation", {
    method: "POST",
    body,
  });
}

export function startImport(
  body: ImportSheetPayload
): Promise<StartImportResponse> {
  return apiRequest<StartImportResponse>("/data-import", {
    method: "POST",
    body,
  });
}
