/**
 * Pure inventory business rules — compliance register MVP.
 */

import type {
  AttentionItem,
  CheckDueState,
  CreateInventoryAssetInput,
  InventoryAsset,
  InventoryAssetIssue,
  InventoryCategoryDef,
  InventoryCheckDef,
  InventoryCheckRecord,
  InventoryCheckResultValue,
  InventoryDisposal,
  InventoryHistoryEntry,
  InventorySettings,
  InventoryStage,
  InventoryStockItem,
  MoveStageInput,
  ReadinessItem,
  RecordCheckInput,
  ScheduleRow,
  StockMoveInput,
  StockState,
} from "../types";

export const DEFAULT_LEAD_DAYS = 30;

/** Subset of settings used by pure due-date / readiness rules. */
export type InventoryRulesContext = Pick<
  InventorySettings,
  "leadDays" | "categoryOverrides" | "competentPersons"
>;

export const DEFAULT_SETTINGS: InventoryRulesContext = {
  leadDays: DEFAULT_LEAD_DAYS,
  categoryOverrides: {},
  competentPersons: [],
};

/** Tag: 2–4 letters, hyphen, digits (e.g. ME-0412). */
export const TAG_PATTERN = /^[A-Z]{2,4}-\d{2,6}$/i;

export const CATEGORIES: InventoryCategoryDef[] = [
  {
    id: "measuring",
    name: "Measuring & test equipment",
    standards: ["ISO 9001 7.1.5"],
    checks: [
      {
        name: "Calibration",
        intervalMonths: 12,
        basis: "ISO 9001 7.1.5 — calibrated at defined intervals",
        requiresCompetence: true,
      },
    ],
  },
  {
    id: "lifting",
    name: "Lifting equipment",
    standards: ["LOLER 1998"],
    checks: [
      {
        name: "Thorough examination",
        intervalMonths: 6,
        basis: "LOLER reg 9 — thorough examination",
        requiresCompetence: true,
      },
    ],
  },
  {
    id: "machinery",
    name: "Production machinery",
    standards: ["PUWER 1998"],
    checks: [
      {
        name: "Planned maintenance",
        intervalMonths: 12,
        basis: "PUWER — maintenance",
      },
      {
        name: "Guarding inspection",
        intervalMonths: 6,
        basis: "PUWER — guarding",
      },
    ],
  },
  {
    id: "pressure",
    name: "Pressure systems",
    standards: ["PSSR 2000"],
    checks: [
      {
        name: "Written scheme examination",
        intervalMonths: 12,
        basis: "PSSR 2000 — written scheme of examination",
        requiresCompetence: true,
      },
    ],
  },
  {
    id: "fire",
    name: "Fire & safety",
    standards: ["BS 5306-3", "RRFSO 2005"],
    checks: [
      {
        name: "Annual service",
        intervalMonths: 12,
        basis: "BS 5306-3 — annual service",
      },
      {
        name: "Visual check",
        intervalMonths: 1,
        basis: "RRFSO — monthly visual check",
      },
    ],
  },
  {
    id: "electrical",
    name: "Electrical appliances",
    standards: ["EAWR 1989", "IET CoP"],
    checks: [
      {
        name: "PAT",
        intervalMonths: 12,
        basis: "EAWR / IET CoP — portable appliance testing",
      },
    ],
  },
  {
    id: "ppe",
    name: "PPE & RPE",
    standards: ["COSHH reg 9", "HSG53"],
    checks: [
      {
        name: "Thorough examination",
        intervalMonths: 1,
        basis: "COSHH / HSG53 — monthly thorough examination",
      },
      {
        name: "Face-fit",
        intervalMonths: 24,
        basis: "HSG53 — face-fit",
      },
    ],
  },
  {
    id: "vehicles",
    name: "Vehicles",
    standards: ["Road Traffic Act", "DVSA"],
    checks: [
      { name: "MOT", intervalMonths: 12, basis: "Road Traffic Act — MOT" },
      { name: "Service", intervalMonths: 12, basis: "DVSA — service" },
      {
        name: "Walk-round",
        intervalMonths: 0,
        basis: "DVSA — daily walk-round (each-use)",
      },
    ],
  },
  {
    id: "environmental",
    name: "Environmental plant",
    standards: ["ISO 14001 8.1"],
    checks: [
      {
        name: "Operational check",
        intervalMonths: 12,
        basis: "ISO 14001 — operational control",
      },
    ],
  },
  {
    id: "it",
    name: "IT & information systems",
    standards: ["ISO 27001 A.5.9"],
    checks: [
      {
        name: "Access review",
        intervalMonths: 12,
        basis: "ISO 27001 — inventory of information assets",
      },
    ],
  },
  {
    id: "general",
    name: "General equipment",
    standards: ["ISO 9001 7.1.3", "ISO 45001 8.1"],
    checks: [
      {
        name: "Planned maintenance",
        intervalMonths: 12,
        basis: "ISO 9001 / 45001 — infrastructure & work equipment",
      },
    ],
  },
];

const ACTIVE_STAGES: InventoryStage[] = [
  "In service",
  "Under maintenance",
  "Quarantined",
  "Commissioned",
];

const ALLOWED_TRANSITIONS: Record<InventoryStage, InventoryStage[]> = {
  Requested: ["Procured", "Retired"],
  Procured: ["Commissioned", "Retired"],
  Commissioned: ["In service", "Retired"],
  "In service": ["Under maintenance", "Quarantined", "Retired"],
  "Under maintenance": ["In service", "Quarantined", "Retired"],
  Quarantined: ["In service", "Under maintenance", "Retired"],
  Retired: ["Disposed", "In service"],
  Disposed: [],
};

export function startOfToday(now = new Date()): Date {
  const d = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  return d;
}

export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addMonthsUtc(isoDate: string, months: number): string {
  const d = new Date(`${isoDate}T00:00:00.000Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return toIsoDate(d);
}

export function daysUntil(dateIso: string, today = startOfToday()): number {
  const target = new Date(`${dateIso}T00:00:00.000Z`);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function categoryByName(name: string): InventoryCategoryDef | undefined {
  return CATEGORIES.find((c) => c.name === name || c.id === name);
}

export function checkDefsForCategory(
  category: string,
  overrides?: Record<string, InventoryCheckDef[]> | null
): InventoryCheckDef[] {
  const fromOverride = overrides?.[category];
  if (fromOverride && fromOverride.length > 0) return fromOverride;
  const byId = categoryByName(category);
  const byNameOverride = byId ? overrides?.[byId.name] : undefined;
  if (byNameOverride && byNameOverride.length > 0) return byNameOverride;
  return byId?.checks ?? [];
}

export function appendHistory(
  history: InventoryHistoryEntry[],
  by: string,
  what: string,
  at = new Date()
): InventoryHistoryEntry[] {
  return [{ t: at.toISOString(), by, what }, ...history].slice(0, 500);
}

export function validateAsset(
  input: Partial<CreateInventoryAssetInput> &
    Pick<CreateInventoryAssetInput, "tag" | "name" | "category">,
  opts?: { existingTags?: Set<string>; excludeTag?: string }
): string | null {
  const tag = input.tag?.trim() ?? "";
  if (!tag) return "Asset tag is required";
  if (!TAG_PATTERN.test(tag)) {
    return "Tag must look like ME-0412 (2–4 letters, hyphen, 2–6 digits)";
  }
  const normalized = tag.toUpperCase();
  if (opts?.existingTags) {
    for (const t of opts.existingTags) {
      if (
        t.toUpperCase() === normalized &&
        t.toUpperCase() !== (opts.excludeTag ?? "").toUpperCase()
      ) {
        return "Asset tag must be unique";
      }
    }
  }
  if (!input.name?.trim()) return "Name is required";
  if (!input.category?.trim()) return "Category is required";
  if (!categoryByName(input.category)) return "Unknown category";
  if (input.criticality) {
    const ok = ["Critical", "High", "Standard", "Low"].includes(
      input.criticality
    );
    if (!ok) return "Invalid criticality";
  }
  if (input.stage) {
    const ok = Object.keys(ALLOWED_TRANSITIONS).includes(input.stage);
    if (!ok) return "Invalid stage";
  }
  const stage = input.stage ?? "Requested";
  const info = Boolean(input.informationAsset);
  if (
    (ACTIVE_STAGES.includes(stage) || info) &&
    !(input.custodian ?? "").trim()
  ) {
    return "Custodian is required for active and information assets";
  }
  if (ACTIVE_STAGES.includes(stage) && !(input.location ?? "").trim()) {
    return "Location is required for active assets";
  }
  if (input.purchaseDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.purchaseDate)) {
      return "Purchase date must be YYYY-MM-DD";
    }
  }
  if (input.cost != null && input.cost < 0) return "Cost cannot be negative";
  return null;
}

export function nextDue(
  asset: Pick<InventoryAsset, "checks" | "purchaseDate">,
  check: InventoryCheckDef,
  today = startOfToday(),
  leadDays = DEFAULT_LEAD_DAYS
): { due: string | null; state: CheckDueState } {
  if (check.intervalMonths === 0) {
    return { due: null, state: "none" };
  }
  const last = asset.checks[check.name];
  const base = last?.date ?? asset.purchaseDate;
  if (!base) return { due: null, state: "none" };
  const due = addMonthsUtc(base, check.intervalMonths);
  const n = daysUntil(due, today);
  if (n < 0) return { due, state: "over" };
  if (n <= leadDays) return { due, state: "soon" };
  return { due, state: "ok" };
}

export function checkRows(
  asset: Pick<
    InventoryAsset,
    "category" | "checks" | "purchaseDate" | "stage"
  >,
  leadDays = DEFAULT_LEAD_DAYS,
  today = startOfToday(),
  overrides?: Record<string, InventoryCheckDef[]> | null
): Array<
  InventoryCheckDef & {
    last: InventoryCheckRecord | null;
    nextDue: string | null;
    state: CheckDueState;
  }
> {
  return checkDefsForCategory(asset.category, overrides).map((def) => {
    const nd = nextDue(asset, def, today, leadDays);
    return {
      ...def,
      last: asset.checks[def.name] ?? null,
      nextDue: nd.due,
      state: nd.state,
    };
  });
}

export function issues(
  asset: InventoryAsset,
  settings: InventoryRulesContext = DEFAULT_SETTINGS,
  today = startOfToday()
): InventoryAssetIssue[] {
  const out: InventoryAssetIssue[] = [];
  if (asset.stage === "Disposed") return out;

  if (asset.stage === "Quarantined") {
    out.push({
      severity: "high",
      code: "quarantined",
      message: "Asset is quarantined — do not use",
    });
  }
  if (asset.stage === "Under maintenance") {
    out.push({
      severity: "medium",
      code: "maintenance",
      message: "Under maintenance",
    });
  }
  if (
    ACTIVE_STAGES.includes(asset.stage) &&
    asset.informationAsset &&
    !asset.custodian.trim()
  ) {
    out.push({
      severity: "high",
      code: "custodian",
      message: "Information asset missing custodian",
    });
  }

  for (const row of checkRows(
    asset,
    settings.leadDays,
    today,
    settings.categoryOverrides
  )) {
    if (row.state === "over") {
      out.push({
        severity: "high",
        code: "overdue",
        message: `${row.name} overdue (due ${row.nextDue})`,
        checkName: row.name,
      });
    } else if (row.state === "soon") {
      out.push({
        severity: "medium",
        code: "soon",
        message: `${row.name} due soon (${row.nextDue})`,
        checkName: row.name,
      });
    } else if (row.state === "none" && row.intervalMonths > 0) {
      out.push({
        severity: "low",
        code: "nocheck",
        message: `${row.name} never recorded`,
        checkName: row.name,
      });
    }
  }
  return out;
}

export function okToUse(
  asset: InventoryAsset,
  settings: InventoryRulesContext = DEFAULT_SETTINGS,
  today = startOfToday()
): boolean {
  if (asset.stage === "Quarantined" || asset.stage === "Under maintenance") {
    return false;
  }
  if (asset.stage === "Retired" || asset.stage === "Disposed") return false;
  if (asset.stage !== "In service" && asset.stage !== "Commissioned") {
    return false;
  }
  return !issues(asset, settings, today).some(
    (i) => i.code === "overdue" || i.code === "quarantined"
  );
}

export function earliestNextDue(
  asset: InventoryAsset,
  today = startOfToday(),
  settings: InventoryRulesContext = DEFAULT_SETTINGS
): { due: string | null; state: CheckDueState } {
  let bestDue: string | null = null;
  let bestState: CheckDueState = "none";
  const rank: Record<CheckDueState, number> = {
    over: 0,
    soon: 1,
    ok: 2,
    none: 3,
  };
  for (const row of checkRows(
    asset,
    settings.leadDays,
    today,
    settings.categoryOverrides
  )) {
    if (!row.nextDue) continue;
    if (
      bestDue === null ||
      rank[row.state] < rank[bestState] ||
      (rank[row.state] === rank[bestState] && row.nextDue < bestDue)
    ) {
      bestDue = row.nextDue;
      bestState = row.state;
    }
  }
  return { due: bestDue, state: bestState };
}

export function validateStageMove(
  asset: InventoryAsset,
  input: MoveStageInput
): string | null {
  const to = input.stage;
  const allowed = ALLOWED_TRANSITIONS[asset.stage] ?? [];
  if (!allowed.includes(to)) {
    return `Cannot move from ${asset.stage} to ${to}`;
  }
  if (to === "Retired" || to === "Disposed") {
    if (!(input.reason ?? "").trim()) return "Reason is required";
    if (!(input.approvedBy ?? "").trim()) return "Approver is required";
  }
  if (to === "Disposed") {
    if (!(input.route ?? "").trim()) return "Disposal route is required";
    if (!(input.evidence ?? "").trim()) {
      return "Disposal evidence is required";
    }
    if (asset.informationAsset && !(input.wipeCert ?? "").trim()) {
      return "Data-wipe / destruction certificate reference is required for information assets";
    }
  }
  return null;
}

export function moveStage(
  asset: InventoryAsset,
  input: MoveStageInput,
  actor: string,
  at = new Date()
): InventoryAsset {
  const err = validateStageMove(asset, input);
  if (err) throw new Error(err);

  let disposal: InventoryDisposal | null = asset.disposal;
  if (input.stage === "Retired" || input.stage === "Disposed") {
    disposal = {
      reason: (input.reason ?? "").trim(),
      route: (input.route ?? "").trim(),
      evidence: (input.evidence ?? "").trim(),
      approvedBy: (input.approvedBy ?? "").trim(),
      date: toIsoDate(at),
      wipeCert: (input.wipeCert ?? "").trim() || undefined,
    };
  }

  const what =
    input.stage === "Disposed"
      ? `Disposed via ${input.route}: ${input.reason}`
      : `Stage → ${input.stage}${input.reason ? `: ${input.reason}` : ""}`;

  return {
    ...asset,
    stage: input.stage,
    disposal,
    history: appendHistory(asset.history, actor, what, at),
  };
}

export function assertCompetentPerson(
  def: InventoryCheckDef | undefined,
  by: string,
  competentPersons: string[]
): void {
  if (!def?.requiresCompetence) return;
  if (!competentPersons.length) return;
  const needle = by.trim().toLowerCase();
  const ok = competentPersons.some(
    (p) => p.trim().toLowerCase() === needle
  );
  if (!ok) {
    throw new Error(
      `"${by.trim()}" is not listed as a competent person for "${def.name}"`
    );
  }
}

export function applyResult(
  asset: InventoryAsset,
  input: RecordCheckInput,
  actor: string,
  at = new Date(),
  overrides?: Record<string, InventoryCheckDef[]> | null,
  competentPersons: string[] = []
): InventoryAsset {
  const defs = checkDefsForCategory(asset.category, overrides);
  const def = defs.find((d) => d.name === input.checkName);
  if (!def) {
    throw new Error(`Unknown check for category: ${input.checkName}`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    throw new Error("Check date must be YYYY-MM-DD");
  }
  const today = toIsoDate(startOfToday(at));
  if (input.date > today) throw new Error("Check date cannot be in the future");
  if (!(input.by ?? "").trim()) throw new Error("Competent person / lab is required");
  assertCompetentPerson(def, input.by, competentPersons);

  const record: InventoryCheckRecord = {
    date: input.date,
    result: input.result,
    by: input.by.trim(),
    ref: (input.ref ?? "").trim(),
    fileId: input.fileId ?? null,
    note: (input.note ?? "").trim() || undefined,
  };

  let stage = asset.stage;
  let history = appendHistory(
    asset.history,
    actor,
    `${input.checkName}: ${input.result}${record.ref ? ` (${record.ref})` : ""}`,
    at
  );

  if (input.result === "Fail") {
    stage = "Quarantined";
    history = appendHistory(
      history,
      actor,
      "Fail → Quarantined. Assess validity of previous results (ISO 9001 7.1.5.2).",
      at
    );
  } else if (
    (input.result === "Pass" || input.result === "Pass with observations") &&
    asset.stage === "Quarantined"
  ) {
    stage = "In service";
    history = appendHistory(
      history,
      actor,
      "Pass after quarantine → returned to In service",
      at
    );
  }

  return {
    ...asset,
    stage,
    checks: { ...asset.checks, [input.checkName]: record },
    history,
  };
}

export function reportFault(
  asset: InventoryAsset,
  note: string,
  actor: string,
  at = new Date()
): InventoryAsset {
  if (!(note ?? "").trim()) throw new Error("Fault note is required");
  if (asset.stage === "Disposed" || asset.stage === "Retired") {
    throw new Error("Cannot report fault on retired/disposed assets");
  }
  return {
    ...asset,
    stage: "Under maintenance",
    history: appendHistory(
      asset.history,
      actor,
      `Fault reported: ${note.trim()}`,
      at
    ),
  };
}

export function moveLocation(
  asset: InventoryAsset,
  location: string,
  actor: string,
  at = new Date()
): InventoryAsset {
  const next = (location ?? "").trim();
  if (!next) throw new Error("Location is required");
  if (asset.stage === "Disposed") {
    throw new Error("Cannot move a disposed asset");
  }
  const prev = asset.location || "(none)";
  return {
    ...asset,
    location: next,
    history: appendHistory(
      asset.history,
      actor,
      `Location moved: ${prev} → ${next}`,
      at
    ),
  };
}

export function confirmSighting(
  asset: InventoryAsset,
  note: string,
  actor: string,
  at = new Date()
): InventoryAsset {
  if (asset.stage === "Disposed") {
    throw new Error("Cannot confirm sighting on a disposed asset");
  }
  const detail = (note ?? "").trim();
  return {
    ...asset,
    history: appendHistory(
      asset.history,
      actor,
      detail ? `Sighting confirmed: ${detail}` : "Sighting confirmed",
      at
    ),
  };
}

export function recordEachUse(
  asset: InventoryAsset,
  checkName: string,
  actor: string,
  note = "",
  at = new Date(),
  overrides?: Record<string, InventoryCheckDef[]> | null
): InventoryAsset {
  const defs = checkDefsForCategory(asset.category, overrides);
  const def = defs.find((d) => d.name === checkName);
  if (!def) throw new Error(`Unknown check for category: ${checkName}`);
  if (def.intervalMonths !== 0) {
    throw new Error(`${checkName} is not an each-use check`);
  }
  if (asset.stage === "Disposed" || asset.stage === "Retired") {
    throw new Error("Cannot record each-use on retired/disposed assets");
  }
  const date = toIsoDate(startOfToday(at));
  const record: InventoryCheckRecord = {
    date,
    result: "Pass",
    by: actor,
    ref: "",
    note: note.trim() || undefined,
  };
  return {
    ...asset,
    checks: { ...asset.checks, [checkName]: record },
    history: appendHistory(
      asset.history,
      actor,
      `Each-use check: ${checkName}${note.trim() ? ` — ${note.trim()}` : ""}`,
      at
    ),
  };
}

export function buildSchedule(
  assets: InventoryAsset[],
  opts: { due?: string; checkType?: string } = {},
  today = startOfToday(),
  settings: InventoryRulesContext = DEFAULT_SETTINGS
): ScheduleRow[] {
  const rows: ScheduleRow[] = [];
  for (const asset of assets) {
    if (asset.stage === "Disposed") continue;
    for (const row of checkRows(
      asset,
      settings.leadDays,
      today,
      settings.categoryOverrides
    )) {
      if (row.intervalMonths === 0) continue;
      if (opts.checkType && row.name !== opts.checkType) continue;
      if (opts.due === "over" && row.state !== "over") continue;
      if (opts.due === "soon" && row.state !== "soon" && row.state !== "over") {
        continue;
      }
      rows.push({
        assetId: asset.id,
        tag: asset.tag,
        name: asset.name,
        category: asset.category,
        stage: asset.stage,
        checkName: row.name,
        basis: row.basis,
        intervalMonths: row.intervalMonths,
        lastDate: row.last?.date ?? null,
        lastResult: row.last?.result ?? null,
        lastRef: row.last?.ref ?? null,
        nextDue: row.nextDue,
        state: row.state,
      });
    }
  }
  const order: Record<CheckDueState, number> = {
    over: 0,
    soon: 1,
    none: 2,
    ok: 3,
  };
  rows.sort((a, b) => {
    const d = order[a.state] - order[b.state];
    if (d !== 0) return d;
    return (a.nextDue ?? "9999").localeCompare(b.nextDue ?? "9999");
  });
  return rows;
}

export function aliceSummary(
  readinessItems: ReadinessItem[],
  attention: AttentionItem[],
  totals: { assets: number; overdueChecks: number; quarantined: number }
): string {
  const gaps = readinessItems.filter((r) => !r.ok);
  if (totals.assets === 0) {
    return "No assets on the register yet. Add equipment to start building audit readiness.";
  }
  if (gaps.length === 0 && attention.length === 0) {
    return `Register looks healthy: ${totals.assets} active asset(s), all readiness checks passing.`;
  }
  const top = attention
    .slice(0, 3)
    .map((a) => `${a.tag} (${a.message})`)
    .join("; ");
  const gapLabels = gaps
    .slice(0, 3)
    .map((g) => g.label.split("—")[0]?.trim() || g.label)
    .join("; ");
  const parts = [
    `${totals.overdueChecks} overdue check(s)`,
    `${totals.quarantined} quarantined`,
    `${gaps.length} readiness gap(s)`,
  ];
  return `Attention needed: ${parts.join(", ")}.${
    gapLabels ? ` Gaps: ${gapLabels}.` : ""
  }${top ? ` Top issues: ${top}.` : ""}`;
}

export function stockState(
  item: Pick<InventoryStockItem, "qty" | "min" | "expiry">,
  leadDays = DEFAULT_LEAD_DAYS,
  today = startOfToday()
): StockState {
  if (item.expiry) {
    const n = daysUntil(item.expiry, today);
    if (n < 0) return "expired";
    if (n <= leadDays) return "expsoon";
  }
  if (item.qty <= item.min) return "low";
  return "ok";
}

export function applyStockMove(
  item: InventoryStockItem,
  input: StockMoveInput,
  actor: string,
  at = new Date()
): InventoryStockItem {
  const qty = Number(input.qty);
  if (!Number.isFinite(qty) || qty < 0) {
    throw new Error("Quantity must be a non-negative number");
  }
  let nextQty = item.qty;
  let batch = item.batch;
  let expiry = item.expiry;
  let what = "";

  switch (input.type) {
    case "issue":
      if (qty <= 0) throw new Error("Issue quantity must be positive");
      if (qty > item.qty) throw new Error("Cannot issue more than on hand");
      nextQty = item.qty - qty;
      what = `Issued ${qty}${input.ref ? ` (${input.ref})` : ""}`;
      break;
    case "receive":
      if (qty <= 0) throw new Error("Receive quantity must be positive");
      nextQty = item.qty + qty;
      if (input.batch?.trim()) batch = input.batch.trim();
      if (input.expiry) expiry = input.expiry;
      what = `Received ${qty}${batch ? ` batch ${batch}` : ""}${
        input.ref ? ` (${input.ref})` : ""
      }`;
      break;
    case "count":
      nextQty = qty;
      what = `Stock take set to ${qty}${input.ref ? ` (${input.ref})` : ""}`;
      break;
    case "quarantine":
      what = `Batch quarantined${input.ref ? `: ${input.ref}` : ""}`;
      break;
    case "dispose":
      if (qty <= 0) throw new Error("Dispose quantity must be positive");
      if (qty > item.qty) throw new Error("Cannot dispose more than on hand");
      nextQty = item.qty - qty;
      what = `Disposed ${qty}${input.ref ? ` (${input.ref})` : ""}`;
      break;
    default:
      throw new Error("Unknown stock movement");
  }

  return {
    ...item,
    qty: nextQty,
    batch,
    expiry,
    history: appendHistory(item.history, actor, what, at),
  };
}

export function registerCsv(
  assets: InventoryAsset[],
  scanUrlFor: (asset: InventoryAsset) => string,
  settings: InventoryRulesContext = DEFAULT_SETTINGS
): string {
  const header = [
    "tag",
    "name",
    "category",
    "location",
    "custodian",
    "stage",
    "criticality",
    "serial",
    "purchaseDate",
    "cost",
    "nextDue",
    "qrUrl",
  ];
  const lines = [header.join(",")];
  for (const a of assets) {
    if (a.stage === "Disposed") continue;
    const nd = earliestNextDue(a, startOfToday(), settings);
    const row = [
      a.tag,
      a.name,
      a.category,
      a.location,
      a.custodian,
      a.stage,
      a.criticality,
      a.serial,
      a.purchaseDate ?? "",
      a.cost != null ? String(a.cost) : "",
      nd.due ?? "",
      scanUrlFor(a),
    ].map(csvEscape);
    lines.push(row.join(","));
  }
  return lines.join("\n");
}

/** Finance-shaped fixed-asset export (cost + purchase date). */
export function fixedAssetsCsv(assets: InventoryAsset[]): string {
  const header = [
    "tag",
    "name",
    "category",
    "cost",
    "purchaseDate",
    "site",
    "status",
    "custodian",
  ];
  const lines = [header.join(",")];
  for (const a of assets) {
    if (a.stage === "Disposed") continue;
    const row = [
      a.tag,
      a.name,
      a.category,
      a.cost != null ? String(a.cost) : "",
      a.purchaseDate ?? "",
      a.location,
      a.stage,
      a.custodian,
    ].map(csvEscape);
    lines.push(row.join(","));
  }
  return lines.join("\n");
}

export function scheduleCsv(
  assets: InventoryAsset[],
  settings: InventoryRulesContext = DEFAULT_SETTINGS
): string {
  const rows = buildSchedule(assets, {}, startOfToday(), settings);
  const header = [
    "tag",
    "name",
    "category",
    "check",
    "intervalMonths",
    "lastDate",
    "nextDue",
    "state",
    "certificate",
  ];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.tag,
        r.name,
        r.category,
        r.checkName,
        String(r.intervalMonths),
        r.lastDate ?? "",
        r.nextDue ?? "",
        r.state,
        r.lastRef ?? "",
      ]
        .map(csvEscape)
        .join(",")
    );
  }
  return lines.join("\n");
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function readiness(
  assets: InventoryAsset[],
  settings: InventoryRulesContext = DEFAULT_SETTINGS,
  today = startOfToday()
): ReadinessItem[] {
  const active = assets.filter((a) => a.stage !== "Disposed");
  const measuring = active.filter(
    (a) => a.category === "Measuring & test equipment"
  );
  const lifting = active.filter((a) => a.category === "Lifting equipment");
  const fire = active.filter((a) => a.category === "Fire & safety");
  const electrical = active.filter(
    (a) => a.category === "Electrical appliances"
  );
  const info = active.filter((a) => a.informationAsset);
  const disposed = assets.filter((a) => a.stage === "Disposed");

  const overdue = active.filter((a) =>
    issues(a, settings, today).some((i) => i.code === "overdue")
  );
  const quarantined = active.filter((a) => a.stage === "Quarantined");
  const noCustodian = info.filter((a) => !a.custodian.trim());
  const disposedWithoutEvidence = disposed.filter(
    (a) => !a.disposal?.evidence?.trim()
  );
  const infoDisposedWithoutWipe = disposed.filter(
    (a) => a.informationAsset && !a.disposal?.wipeCert?.trim()
  );
  const measuringUncalibrated = measuring.filter((a) => {
    const cal = a.checks["Calibration"];
    if (!cal) return true;
    const nd = nextDue(
      a,
      { name: "Calibration", intervalMonths: 12, basis: "" },
      today
    );
    return nd.state === "over" || nd.state === "none";
  });

  return [
    {
      id: "iso-register",
      label: "ISO 9001 7.1.3 — Equipment identified on register",
      ok: active.length > 0,
      detail:
        active.length > 0
          ? `${active.length} active asset(s)`
          : "No assets on register",
    },
    {
      id: "iso-calibration",
      label: "ISO 9001 7.1.5 — Measuring equipment in calibration",
      ok: measuring.length === 0 || measuringUncalibrated.length === 0,
      detail:
        measuring.length === 0
          ? "No measuring equipment"
          : measuringUncalibrated.length === 0
            ? "All calibrated"
            : `${measuringUncalibrated.length} out of calibration / never calibrated`,
    },
    {
      id: "iso-quarantine",
      label: "ISO 9001 7.1.5.2 — Failed equipment quarantined",
      ok: quarantined.every((a) =>
        a.history.some((h) => h.what.includes("7.1.5.2"))
      ),
      detail:
        quarantined.length === 0
          ? "No quarantined assets"
          : `${quarantined.length} quarantined`,
    },
    {
      id: "loler",
      label: "LOLER — Lifting equipment examinations due",
      ok: lifting.every(
        (a) => !issues(a, settings, today).some((i) => i.code === "overdue")
      ),
      detail:
        lifting.length === 0
          ? "No lifting equipment"
          : `${lifting.length} lifting asset(s)`,
    },
    {
      id: "fire",
      label: "Fire safety — Extinguishers / fire equipment serviced",
      ok: fire.every(
        (a) => !issues(a, settings, today).some((i) => i.code === "overdue")
      ),
      detail: fire.length === 0 ? "No fire equipment" : `${fire.length} item(s)`,
    },
    {
      id: "pat",
      label: "EAWR — Portable appliance testing current",
      ok: electrical.every(
        (a) => !issues(a, settings, today).some((i) => i.code === "overdue")
      ),
      detail:
        electrical.length === 0
          ? "No electrical appliances"
          : `${electrical.length} appliance(s)`,
    },
    {
      id: "iso27001-custodian",
      label: "ISO 27001 A.5.9 — Information assets have custodians",
      ok: noCustodian.length === 0,
      detail:
        info.length === 0
          ? "No information assets"
          : noCustodian.length === 0
            ? "All have custodians"
            : `${noCustodian.length} missing custodian`,
    },
    {
      id: "iso27001-disposal",
      label: "ISO 27001 A.7.14 — Secure disposal evidence",
      ok: infoDisposedWithoutWipe.length === 0,
      detail:
        disposed.filter((a) => a.informationAsset).length === 0
          ? "No disposed information assets"
          : infoDisposedWithoutWipe.length === 0
            ? "Wipe certificates recorded"
            : `${infoDisposedWithoutWipe.length} missing wipe certificate`,
    },
    {
      id: "weee",
      label: "WEEE — Disposal evidence retained",
      ok: disposedWithoutEvidence.length === 0,
      detail:
        disposed.length === 0
          ? "No disposals"
          : disposedWithoutEvidence.length === 0
            ? "Evidence on all disposals"
            : `${disposedWithoutEvidence.length} missing evidence`,
    },
    {
      id: "overdue",
      label: "No overdue statutory / calibration checks",
      ok: overdue.length === 0,
      detail:
        overdue.length === 0
          ? "All checks current"
          : `${overdue.length} asset(s) with overdue checks`,
    },
  ];
}

export function isActiveForCounts(stage: InventoryStage): boolean {
  return stage !== "Disposed";
}
