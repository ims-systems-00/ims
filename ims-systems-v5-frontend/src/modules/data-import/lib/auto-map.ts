/**
 * Suggest CSV column → field path mappings from header names.
 * Matches field alias or path (case-insensitive, trimmed).
 * Skips business-unit / ownership controller fields (org directory picks).
 */

import type { ImportableFieldSchema, ImportDataMap } from "../types";

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function suggestColumnMappings(
  columns: string[],
  fields: ImportableFieldSchema[]
): ImportDataMap {
  const byHeader = new Map(
    columns.map((column) => [normalize(column), column] as const)
  );
  const map: ImportDataMap = {};

  for (const field of fields) {
    if (field.isBusinessUnitController || field.isOwnerShipControler) {
      continue;
    }
    const byAlias = byHeader.get(normalize(field.alias));
    const byPath = byHeader.get(normalize(field.path));
    const match = byAlias ?? byPath;
    if (match) map[field.path] = match;
  }

  return map;
}

export function missingRequiredFields(
  fields: ImportableFieldSchema[],
  dataMap: ImportDataMap,
  excludedPaths: string[] = []
): ImportableFieldSchema[] {
  return fields.filter((field) => {
    if (!field.isRequired) return false;
    if (excludedPaths.includes(field.path)) return true;
    return !dataMap[field.path];
  });
}
