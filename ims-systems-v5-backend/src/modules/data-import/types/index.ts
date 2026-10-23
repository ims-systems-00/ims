/**
 * Data Import domain types.
 * Spec: docs/module-specifications/data-import.md
 *
 * Access is gated by Users Read (same as the V4 wizard route policy).
 */

export const DATA_IMPORT_RESOURCE = "users";

/** Wizard-exposed modules (V4 module keys, preserved for API compatibility). */
export const IMPORTABLE_MODULES = [
  "customers",
  "risks",
  "incidents",
  "hardwareassets",
  "informationassets",
  "peopleassets",
  "premiseassets",
  "softwareassets",
] as const;

export type ImportableModule = (typeof IMPORTABLE_MODULES)[number];

export const IMPORT_DATE_FORMATS = ["DD/MM/YYYY"] as const;
export type ImportDateFormat = (typeof IMPORT_DATE_FORMATS)[number];

export type ImportFieldType = "string" | "number" | "date" | "email";

export type ImportableFieldSchema = {
  alias: string;
  path: string;
  type: ImportFieldType;
  isRequired: boolean;
  isClientImportable: true;
  isBusinessUnitController: boolean;
  isOwnerShipControler: boolean;
};

export type ImportDataMap = Record<string, string>;

/** One spreadsheet row keyed by CSV header names. */
export type ImportDataRow = Record<string, unknown>;

export type ImportSheetPayload = {
  module: ImportableModule;
  dateFormat: ImportDateFormat;
  dataMap: ImportDataMap;
  dataSet: ImportDataRow[];
};

export type FieldValidationError = {
  message: string;
};

export type FieldValidationResult = {
  name: string;
  errors: FieldValidationError[];
  totalError: number;
};

export type ValidationOutcome = {
  success: boolean;
  result: FieldValidationResult[];
};

export type DataImportJob = {
  organizationId: string;
  importerId: string;
  importerName: string;
  module: ImportableModule;
  dateFormat: ImportDateFormat;
  dataMap: ImportDataMap;
  dataSet: ImportDataRow[];
  startedAt: string;
};

export type ModuleOption = {
  module: ImportableModule;
  label: string;
};
