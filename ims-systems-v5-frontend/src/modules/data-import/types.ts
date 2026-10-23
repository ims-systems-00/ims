/**
 * Data Import frontend types — mirrors backend contract.
 * Spec: docs/module-specifications/data-import.md
 */

export const IMPORTABLE_MODULES = [
  "customers",
  "risks",
  "incidents",
  "hardwareassets",
  "informationassets",
  "peopleassets",
  "premiseassets",
  "softwareassets",
  "kpiobjectives",
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

export type ModuleOption = {
  module: ImportableModule;
  label: string;
};

export type ImportDataMap = Record<string, string>;
export type ImportDataRow = Record<string, unknown>;

export type ImportSheetPayload = {
  module: ImportableModule;
  dateFormat: ImportDateFormat;
  format?: string;
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

export type ValidationResponse = {
  message: string;
  validation: ValidationOutcome;
};

export type SchemaResponse = {
  message: string;
  schema: ImportableFieldSchema[];
};

export type StartImportResponse = {
  message: string;
};

/** One uploaded CSV sheet in the wizard. */
export type ParsedSheet = {
  id: string;
  name: string;
  columns: string[];
  rows: ImportDataRow[];
  /** path → CSV column name OR fixed ObjectId for controller fields */
  dataMap: ImportDataMap;
  /** Optional fields the user opted out of migrating */
  excludedPaths: string[];
  validation?: ValidationOutcome;
};
