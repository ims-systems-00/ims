import { StatusBadge } from "@/shared/components/status-badge";
import {
  scoreBandLabel,
  type RiskDisplayStatus,
  type RiskScoreBand,
} from "../types";

const statusTone: Record<
  RiskDisplayStatus,
  "neutral" | "success" | "warning" | "destructive" | "info"
> = {
  Open: "info",
  Escalated: "warning",
  Mitigated: "success",
  Accepted: "neutral",
};

export function RiskStatusBadge({ status }: { status: RiskDisplayStatus }) {
  return <StatusBadge tone={statusTone[status]}>{status}</StatusBadge>;
}

const bandTone: Record<
  RiskScoreBand,
  "neutral" | "success" | "warning" | "destructive" | "info"
> = {
  low: "success",
  medium: "warning",
  high: "destructive",
};

export function RiskScoreBadge({
  total,
  band,
}: {
  total: number;
  band: RiskScoreBand;
}) {
  return (
    <StatusBadge tone={bandTone[band]}>
      <span className="tabular-nums">{total}</span>
      <span className="text-[0.625rem] opacity-80">· {scoreBandLabel(band)}</span>
    </StatusBadge>
  );
}
