/**
 * Public surface for the Data Import module.
 * Spec: docs/module-specifications/data-import.md
 */

export {
  createDataImportModule,
  createDataImportRouter,
} from "./routes/data-import.routes";
export type { DataImportRouterDeps } from "./routes/data-import.routes";

export { createDataImportService } from "./services/data-import.service";
export type { DataImportService } from "./services/data-import.service";
export { createDataImportMigrator } from "./services/migrator.service";
export type { DataImportMigrator } from "./services/migrator.service";
export {
  validateDataSet,
  transformDataSet,
  assertRequiredMappings,
} from "./services/validation.service";

export { createDataImportNotificationAdapter } from "./adapters/notification.adapter";
export { createDataImportTargetWriterAdapter } from "./adapters/target-writer.adapter";
export type { DataImportTargetServices } from "./adapters/target-writer.adapter";

export {
  NoOpDataImportNotificationAdapter,
  NoOpDataImportTargetWriterAdapter,
  InlineDataImportQueueAdapter,
} from "./ports";
export type {
  DataImportNotificationPort,
  DataImportQueuePort,
  DataImportTargetWriterPort,
} from "./ports";

export type {
  ImportableModule,
  ImportableFieldSchema,
  ImportSheetPayload,
  ValidationOutcome,
  DataImportJob,
  ModuleOption,
} from "./types";
export {
  DATA_IMPORT_RESOURCE,
  IMPORTABLE_MODULES,
  IMPORT_DATE_FORMATS,
} from "./types";
export { MODULE_OPTIONS, getImportableFields } from "./catalogs/importable-fields";
