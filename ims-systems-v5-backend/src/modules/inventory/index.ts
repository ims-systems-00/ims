/**
 * Inventory & Assets module (compliance register).
 * Distinct from modules/assets (legacy five-category inventory).
 */

export { createInventoryModule } from "./routes/inventory.routes";
export type { InventoryRouterDeps } from "./routes/inventory.routes";
export { createInventoryService } from "./services/inventory.service";
export type { InventoryService } from "./services/inventory.service";
export {
  createInventoryTaskAdapter,
  createInventoryIncidentAdapter,
  createInventorySupplierAdapter,
} from "./adapters";
export {
  NoOpInventoryTaskAdapter,
  NoOpInventoryIncidentAdapter,
  NoOpInventorySupplierAdapter,
  type InventoryTaskPort,
  type InventoryIncidentPort,
  type InventorySupplierPort,
} from "./ports";
export {
  INVENTORY_MODULE_RESOURCE,
  INVENTORY_STAGES,
  INVENTORY_CRITICALITIES,
  INVENTORY_CHECK_RESULTS,
  INVENTORY_DISPOSAL_ROUTES,
} from "./types";
export type {
  InventoryAsset,
  InventoryAssetListItem,
  InventoryOverview,
  ScheduleRow,
  InventoryCategoryDef,
  InventorySettings,
  InventoryStockItem,
} from "./types";
export {
  CATEGORIES,
  validateAsset,
  validateStageMove,
  applyResult,
  moveStage,
  readiness,
  issues,
  okToUse,
} from "./lib/inventory-rules";
