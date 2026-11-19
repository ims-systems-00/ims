import { StatusBadge } from "@/shared/components/status-badge";
import { docStateLabel } from "../lib/asl-display";
import type { AslCriticality, AslDocState, AslStatus } from "../types";

export function AslStatusBadge({ status }: { status: AslStatus | string }) {
  const tone =
    status === "Approved"
      ? "success"
      : status === "Conditional" || status === "Prospective"
        ? "warning"
        : status === "Suspended" || status === "Removed"
          ? "destructive"
          : "neutral";
  return <StatusBadge tone={tone}>{status}</StatusBadge>;
}

export function AslCritBadge({ crit }: { crit: AslCriticality | string }) {
  const tone =
    crit === "Critical" ? "destructive" : crit === "High" ? "warning" : "neutral";
  return <StatusBadge tone={tone}>{crit}</StatusBadge>;
}

export function AslDocStateBadge({ state }: { state: AslDocState }) {
  const tone =
    state === "ok"
      ? "success"
      : state === "soon"
        ? "warning"
        : "destructive";
  return <StatusBadge tone={tone}>{docStateLabel(state)}</StatusBadge>;
}
