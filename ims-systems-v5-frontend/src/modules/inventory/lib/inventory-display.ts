import type {
  CheckDueState,
  InventoryHubView,
  InventoryStage,
} from "../types";

export const INVENTORY_VIEW_LABELS: Record<InventoryHubView, string> = {
  overview: "Overview",
  register: "Asset register",
  schedule: "Inspections & calibration",
  labels: "QR labels",
  stock: "Consumables & stock",
  disposals: "Disposals",
  compliance: "Compliance map",
  auditor: "Auditor pack",
  settings: "Settings",
};

export function stageTone(
  stage: InventoryStage
): "ok" | "warn" | "danger" | "muted" {
  switch (stage) {
    case "In service":
    case "Commissioned":
      return "ok";
    case "Under maintenance":
    case "Requested":
    case "Procured":
      return "warn";
    case "Quarantined":
      return "danger";
    default:
      return "muted";
  }
}

export function dueTone(
  state: CheckDueState | undefined
): "ok" | "warn" | "danger" | "muted" {
  switch (state) {
    case "over":
      return "danger";
    case "soon":
      return "warn";
    case "ok":
      return "ok";
    default:
      return "muted";
  }
}

export function dueLabel(state: CheckDueState | undefined): string {
  switch (state) {
    case "over":
      return "Overdue";
    case "soon":
      return "Due soon";
    case "ok":
      return "OK";
    default:
      return "—";
  }
}

export function formatInterval(months: number): string {
  if (months === 0) return "Each use";
  if (months === 1) return "Monthly";
  if (months === 12) return "Annual";
  return `Every ${months} months`;
}

export function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}
