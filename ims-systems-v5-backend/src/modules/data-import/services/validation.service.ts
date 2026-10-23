/**
 * Validate a mapped spreadsheet against the target module field rules.
 */

import { ValidationAppError } from "../../../shared/errors/app-error";
import {
  getFieldByPath,
  getImportableFields,
} from "../catalogs/importable-fields";
import type {
  FieldValidationResult,
  ImportDataMap,
  ImportDataRow,
  ImportDateFormat,
  ImportableModule,
  ValidationOutcome,
} from "../types";
import { getFieldRule } from "./field-rules";
import { castImportValue } from "./type-casting";

export function assertRequiredMappings(
  module: ImportableModule,
  dataMap: ImportDataMap
): void {
  const missing = getImportableFields(module)
    .filter((field) => field.isRequired && !dataMap[field.path])
    .map((field) => field.alias);
  if (missing.length > 0) {
    throw new ValidationAppError(
      `Required fields need to be mapped: ${missing.join(", ")}`
    );
  }
}

function resolveRawValue(
  fieldPath: string,
  dataMap: ImportDataMap,
  row: ImportDataRow,
  isController: boolean
): unknown {
  const mapped = dataMap[fieldPath];
  if (mapped === undefined) return undefined;
  if (isController) return mapped;
  return row[mapped];
}

/**
 * Validate every mapped column across every row.
 * Row numbers are spreadsheet rows (header = 1 → first data row = 2).
 */
export function validateDataSet(input: {
  module: ImportableModule;
  dateFormat: ImportDateFormat;
  dataMap: ImportDataMap;
  dataSet: ImportDataRow[];
}): ValidationOutcome {
  assertRequiredMappings(input.module, input.dataMap);

  const results: FieldValidationResult[] = [];

  for (const [path, mapped] of Object.entries(input.dataMap)) {
    const schemaField = getFieldByPath(input.module, path);
    if (!schemaField) continue;

    const rule = getFieldRule(input.module, path);
    const errors: FieldValidationResult["errors"] = [];
    const isController =
      schemaField.isBusinessUnitController || schemaField.isOwnerShipControler;

    for (let index = 0; index < input.dataSet.length; index += 1) {
      const row = input.dataSet[index]!;
      const spreadsheetRow = index + 2;
      const raw = resolveRawValue(path, input.dataMap, row, isController);

      if (
        (raw === undefined || raw === null || raw === "") &&
        schemaField.isRequired
      ) {
        errors.push({
          message: `Error column '${mapped}' at row ${spreadsheetRow}: "${schemaField.alias}" is required`,
        });
        continue;
      }

      if (raw === undefined || raw === null || raw === "") {
        continue;
      }

      const cast = castImportValue(raw, schemaField.type, input.dateFormat);
      if (!cast.ok) {
        errors.push({
          message: `Error column '${mapped}' at row ${spreadsheetRow}: ${cast.message}`,
        });
        continue;
      }

      if (!rule) continue;
      const parsed = rule.safeParse(cast.value);
      if (!parsed.success) {
        const detail =
          parsed.error.issues[0]?.message ?? "failed validation";
        errors.push({
          message: `Error column '${mapped}' at row ${spreadsheetRow}: ${detail}`,
        });
      }
    }

    results.push({
      name: schemaField.alias,
      errors,
      totalError: errors.length,
    });
  }

  return {
    success: results.every((row) => row.totalError === 0),
    result: results,
  };
}

/**
 * Transform a dataset into typed objects keyed by schema paths
 * (controller fields take the fixed map value).
 */
export function transformDataSet(input: {
  module: ImportableModule;
  dateFormat: ImportDateFormat;
  dataMap: ImportDataMap;
  dataSet: ImportDataRow[];
}): Record<string, unknown>[] {
  return input.dataSet.map((row) => {
    const out: Record<string, unknown> = {};
    for (const [path, mapped] of Object.entries(input.dataMap)) {
      const schemaField = getFieldByPath(input.module, path);
      if (!schemaField) continue;
      const isController =
        schemaField.isBusinessUnitController ||
        schemaField.isOwnerShipControler;
      const raw = isController ? mapped : row[mapped];
      if (raw === undefined || raw === null || raw === "") continue;
      const cast = castImportValue(raw, schemaField.type, input.dateFormat);
      if (cast.ok && cast.value !== undefined) {
        out[path] = cast.value;
      }
    }
    return out;
  });
}
