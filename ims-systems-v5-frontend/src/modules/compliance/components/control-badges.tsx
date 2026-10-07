import { StatusBadge } from "@/shared/components/status-badge";
import {
  displayControlState,
  type ControlSelected,
  type ControlState,
} from "../types";

export function ControlSelectedBadge({
  selected,
}: {
  selected: ControlSelected;
}) {
  return (
    <StatusBadge tone={selected === "Selected" ? "info" : "neutral"}>
      {selected}
    </StatusBadge>
  );
}

export function ControlStateBadge({ state }: { state: ControlState }) {
  const label = displayControlState(state);
  const tone =
    label === "Implemented"
      ? "success"
      : label === "Partially implemented"
        ? "warning"
        : "neutral";
  return <StatusBadge tone={tone}>{label}</StatusBadge>;
}

export function CompliancePercentBadge({ value }: { value: number }) {
  const tone =
    value >= 100 ? "success" : value > 0 ? "info" : "neutral";
  return <StatusBadge tone={tone}>{value}%</StatusBadge>;
}
