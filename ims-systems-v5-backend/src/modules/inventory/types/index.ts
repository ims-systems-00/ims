/**
 * Inventory & Assets domain types (compliance register MVP).
 * Product requirements: frontend/src/assets/ims-inventory-module/SPECIFICATION.md
 */

/** Reuse existing OpenFGA resource so Inventory sidebar permissions keep working. */
export const INVENTORY_MODULE_RESOURCE = "inventory" as const;

export const INVENTORY_STAGES = [
  "Requested",
  "Procured",
  "Commissioned",
  "In service",
  "Under maintenance",
  "Quarantined",
  "Retired",
  "Disposed",
] as const;
export type InventoryStage = (typeof INVENTORY_STAGES)[number];

export const INVENTORY_CRITICALITIES = [
  "Critical",
  "High",
  "Standard",
  "Low",
] as const;
export type InventoryCriticality = (typeof INVENTORY_CRITICALITIES)[number];

export const INVENTORY_CHECK_RESULTS = [
  "Pass",
  "Pass with observations",
  "Fail",
] as const;
export type InventoryCheckResultValue =
  (typeof INVENTORY_CHECK_RESULTS)[number];

export const INVENTORY_DISPOSAL_ROUTES = [
  "Reuse / redeploy",
  "Sale",
  "Recycling (WEEE)",
  "Licensed waste carrier",
  "Secure destruction",
  "Return to supplier",
  "Other",
] as const;
export type InventoryDisposalRoute =
  (typeof INVENTORY_DISPOSAL_ROUTES)[number];

export type CheckDueState = "none" | "over" | "soon" | "ok";

/** Category definition: name + default checks [name, intervalMonths, basis]. */
export type InventoryCheckDef = {
  name: string;
  /** 0 = each-use (recorded by exception). */
  intervalMonths: number;
  basis: string;
  /** When true, `by` must match settings.competentPersons (if that list is non-empty). */
  requiresCompetence?: boolean;
};

export type InventoryCategoryDef = {
  id: string;
  name: string;
  checks: InventoryCheckDef[];
  standards: string[];
};

export type InventoryCheckRecord = {
  date: string;
  result: InventoryCheckResultValue;
  by: string;
  ref: string;
  fileId?: string | null;
  note?: string;
};

export type InventoryHistoryEntry = {
  t: string;
  by: string;
  what: string;
};

export type InventoryDisposal = {
  reason: string;
  route: string;
  evidence: string;
  approvedBy: string;
  date: string;
  wipeCert?: string;
};

export type InventoryAsset = {
  id: string;
  organizationId: string;
  tag: string;
  name: string;
  category: string;
  location: string;
  custodian: string;
  stage: InventoryStage;
  criticality: InventoryCriticality;
  makeModel: string;
  serial: string;
  purchaseDate: string | null;
  cost: number | null;
  supplier: string;
  warrantyEnds: string | null;
  informationAsset: boolean;
  safetyNotes: string;
  labelPrinted: boolean;
  /** Last result per check name. */
  checks: Record<string, InventoryCheckRecord>;
  history: InventoryHistoryEntry[];
  disposal: InventoryDisposal | null;
  createdBy: string;
  createdOn: string;
  updatedBy: string | null;
  updatedOn: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InventoryAssetIssue = {
  severity: "high" | "medium" | "low";
  code: string;
  message: string;
  checkName?: string;
};

export type InventoryAssetListItem = InventoryAsset & {
  nextDue: string | null;
  nextDueState: CheckDueState;
  issues: InventoryAssetIssue[];
  okToUse: boolean;
};

export type CreateInventoryAssetInput = {
  tag: string;
  name: string;
  category: string;
  location?: string;
  custodian?: string;
  stage?: InventoryStage;
  criticality?: InventoryCriticality;
  makeModel?: string;
  serial?: string;
  purchaseDate?: string | null;
  cost?: number | null;
  supplier?: string;
  warrantyEnds?: string | null;
  informationAsset?: boolean;
  safetyNotes?: string;
  labelPrinted?: boolean;
};

export type UpdateInventoryAssetInput = Partial<CreateInventoryAssetInput>;

export type MoveStageInput = {
  stage: InventoryStage;
  reason?: string;
  approvedBy?: string;
  route?: string;
  evidence?: string;
  wipeCert?: string;
};

export type RecordCheckInput = {
  checkName: string;
  date: string;
  result: InventoryCheckResultValue;
  by: string;
  ref?: string;
  fileId?: string | null;
  note?: string;
};

export type ReportFaultInput = {
  note: string;
};

export type MoveLocationInput = {
  location: string;
};

export type ConfirmSightingInput = {
  note?: string;
};

export type RecordEachUseInput = {
  checkName: string;
  note?: string;
};

export type MarkLabelledInput = {
  ids: string[];
};

export type ListInventoryAssetsQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: string;
  stage?: InventoryStage;
  site?: string;
  issue?: boolean;
  includeDisposed?: boolean;
};

export type PaginatedInventoryAssets = {
  items: InventoryAssetListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type ScheduleRow = {
  assetId: string;
  tag: string;
  name: string;
  category: string;
  stage: InventoryStage;
  checkName: string;
  basis: string;
  intervalMonths: number;
  lastDate: string | null;
  lastResult: InventoryCheckResultValue | null;
  lastRef: string | null;
  nextDue: string | null;
  state: CheckDueState;
};

export type ListScheduleQuery = {
  due?: "over" | "soon" | "";
  checkType?: string;
};

export type ReadinessItem = {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
};

export type AttentionItem = {
  severity: "high" | "medium" | "low";
  assetId: string;
  tag: string;
  name: string;
  message: string;
};

export type InventoryOverview = {
  totals: {
    assets: number;
    inService: number;
    quarantined: number;
    underMaintenance: number;
    overdueChecks: number;
    soonChecks: number;
    stockLow: number;
    stockExpired: number;
  };
  attention: AttentionItem[];
  readiness: ReadinessItem[];
  activity: InventoryHistoryEntry[];
  aliceSummary: string;
};

export type InventoryCheckOverride = {
  name: string;
  intervalMonths: number;
  basis: string;
  requiresCompetence?: boolean;
};

export type InventorySettings = {
  id: string;
  organizationId: string;
  leadDays: number;
  requireLoginForScanActions: boolean;
  scanBase: string | null;
  categoryOverrides: Record<string, InventoryCheckOverride[]>;
  /** Named competent persons / labs allowed for gated checks. Empty = no gate. */
  competentPersons: string[];
  updatedBy: string | null;
  updatedOn: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UpdateInventorySettingsInput = {
  leadDays?: number;
  requireLoginForScanActions?: boolean;
  scanBase?: string | null;
  categoryOverrides?: Record<string, InventoryCheckOverride[]>;
  competentPersons?: string[];
};

export type StockState = "low" | "expired" | "expsoon" | "ok";

export const STOCK_MOVE_TYPES = [
  "issue",
  "receive",
  "count",
  "quarantine",
  "dispose",
] as const;
export type StockMoveType = (typeof STOCK_MOVE_TYPES)[number];

export type InventoryStockItem = {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  location: string;
  qty: number;
  min: number;
  max: number;
  batch: string;
  expiry: string | null;
  history: InventoryHistoryEntry[];
  createdBy: string;
  createdOn: string;
  updatedBy: string | null;
  updatedOn: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InventoryStockListItem = InventoryStockItem & {
  state: StockState;
};

export type CreateStockItemInput = {
  code: string;
  name: string;
  location?: string;
  qty?: number;
  min?: number;
  max?: number;
  batch?: string;
  expiry?: string | null;
};

export type UpdateStockItemInput = Partial<CreateStockItemInput>;

export type StockMoveInput = {
  type: StockMoveType;
  qty: number;
  batch?: string;
  expiry?: string | null;
  ref?: string;
};

export type InventoryScanSnapshot = {
  id: string;
  organizationId: string;
  tag: string;
  name: string;
  category: string;
  location: string;
  custodian: string;
  stage: InventoryStage;
  safetyNotes: string;
  okToUse: boolean;
  checks: Array<{
    name: string;
    intervalMonths: number;
    lastDate: string | null;
    lastResult: InventoryCheckResultValue | null;
    nextDue: string | null;
    state: CheckDueState;
  }>;
  lastActivity: InventoryHistoryEntry | null;
  requireLoginForScanActions: boolean;
};

export type PublicOrgTagParams = {
  organizationId: string;
  tag: string;
};
