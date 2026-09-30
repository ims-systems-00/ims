/**
 * Public surface for the Assets (Inventory) module.
 * Other modules may import only from this entry.
 */

export { createAssetsRouter, createAssetsModule } from "./routes/assets.routes";
export type { AssetsRouterDeps } from "./routes/assets.routes";
export { createAssetsService } from "./services/assets.service";
export type { AssetsService } from "./services/assets.service";
export {
  AcceptAnyUserAdapter,
  AcceptAnyBusinessUnitAdapter,
  AcceptAnyCategoryAdapter,
} from "./ports";
export type {
  UserLookupPort,
  BusinessUnitLookupPort,
  CategoryLookupPort,
} from "./ports";
export type {
  AssetCategory,
  HardwareAsset,
  SoftwareAsset,
  PeopleAsset,
  PremiseAsset,
  InformationAsset,
  InventoryStats,
  ListAssetsQuery,
  Paginated,
} from "./types";
export {
  ASSET_CATEGORIES,
  ASSET_REFERENCE_PREFIX,
  INVENTORY_RESOURCE,
} from "./types";
