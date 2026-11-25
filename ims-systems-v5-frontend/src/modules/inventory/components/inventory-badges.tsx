import { StatusBadge } from "@/shared/components/status-badge";
import { dueLabel } from "../lib/inventory-display";
import type {
  CheckDueState,
  InventoryCriticality,
  InventoryStage,
} from "../types";

export function InventoryStageBadge({
  stage,
}: {
  stage: InventoryStage | string;
}) {
  const tone =
    stage === "In service" || stage === "Commissioned"
      ? "success"
      : stage === "Quarantined"
        ? "destructive"
        : stage === "Under maintenance" ||
            stage === "Requested" ||
            stage === "Procured"
          ? "warning"
          : "neutral";
  return <StatusBadge tone={tone}>{stage}</StatusBadge>;
}

export function InventoryCritBadge({
  crit,
}: {
  crit: InventoryCriticality | string;
}) {
  const tone =
    crit === "Critical"
      ? "destructive"
      : crit === "High"
        ? "warning"
        : "neutral";
  return <StatusBadge tone={tone}>{crit}</StatusBadge>;
}

export function InventoryDueBadge({
  state,
}: {
  state: CheckDueState | undefined;
}) {
  const tone =
    state === "over"
      ? "destructive"
      : state === "soon"
        ? "warning"
        : state === "ok"
          ? "success"
          : "neutral";
  return <StatusBadge tone={tone}>{dueLabel(state)}</StatusBadge>;
}
