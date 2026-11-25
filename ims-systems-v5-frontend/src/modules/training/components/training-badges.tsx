import { StatusBadge } from "@/shared/components/status-badge";
import { cellLabel } from "../lib/training-display";
import type {
  TrainingCellState,
  TrainingPersonStatus,
  TrainingRequirementLevel,
  TrainingSessionStatus,
} from "../types";

export function TrainingCellBadge({
  state,
}: {
  state: TrainingCellState | undefined;
}) {
  const tone =
    state === "over" || state === "none"
      ? "destructive"
      : state === "soon" || state === "grace"
        ? "warning"
        : state === "ok"
          ? "success"
          : "neutral";
  return <StatusBadge tone={tone}>{cellLabel(state)}</StatusBadge>;
}

export function TrainingPersonStatusBadge({
  status,
}: {
  status: TrainingPersonStatus | string;
}) {
  const tone =
    status === "Active"
      ? "success"
      : status === "Pre-start"
        ? "warning"
        : "neutral";
  return <StatusBadge tone={tone}>{status}</StatusBadge>;
}

export function TrainingSessionStatusBadge({
  status,
}: {
  status: TrainingSessionStatus | string;
}) {
  const tone =
    status === "Completed"
      ? "success"
      : status === "Planned"
        ? "warning"
        : "neutral";
  return <StatusBadge tone={tone}>{status}</StatusBadge>;
}

export function TrainingLevelBadge({
  level,
}: {
  level: TrainingRequirementLevel | string;
}) {
  const tone =
    level === "mandatory"
      ? "destructive"
      : level === "desirable"
        ? "warning"
        : "neutral";
  return (
    <StatusBadge tone={tone}>
      {level === "mandatory"
        ? "Mandatory"
        : level === "desirable"
          ? "Desirable"
          : "Exempt"}
    </StatusBadge>
  );
}
