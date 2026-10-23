import { useMutation, useQuery } from "@tanstack/react-query";
import {
  getImportSchema,
  listImportModules,
  startImport,
  validateImportSheet,
} from "../api/data-import";
import type { ImportableModule, ImportSheetPayload } from "../types";

export const dataImportKeys = {
  all: ["data-import"] as const,
  modules: () => [...dataImportKeys.all, "modules"] as const,
  schema: (module: ImportableModule) =>
    [...dataImportKeys.all, "schema", module] as const,
};

export function useImportModulesQuery() {
  return useQuery({
    queryKey: dataImportKeys.modules(),
    queryFn: listImportModules,
  });
}

export function useImportSchemaQuery(
  module: ImportableModule | null,
  enabled = true
) {
  return useQuery({
    queryKey: dataImportKeys.schema(module ?? "customers"),
    queryFn: () => getImportSchema(module!),
    enabled: Boolean(module) && enabled,
  });
}

export function useValidateImportMutation() {
  return useMutation({
    mutationFn: (body: ImportSheetPayload) => validateImportSheet(body),
  });
}

export function useStartImportMutation() {
  return useMutation({
    mutationFn: (body: ImportSheetPayload) => startImport(body),
  });
}
