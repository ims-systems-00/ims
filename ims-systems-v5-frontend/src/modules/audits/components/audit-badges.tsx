import { StatusBadge } from "@/shared/components/status-badge";
import type { AuditDisplayStatus, AuditInterval, AuditType } from "../types";

const statusTone: Record<
  AuditDisplayStatus,
  "neutral" | "success" | "warning" | "destructive" | "info"
> = {
  Scheduled: "info",
  Completed: "success",
};

export function AuditStatusBadge({ status }: { status: AuditDisplayStatus }) {
  return <StatusBadge tone={statusTone[status]}>{status}</StatusBadge>;
}

const typeTone: Record<
  AuditType,
  "neutral" | "success" | "warning" | "destructive" | "info"
> = {
  Internal: "neutral",
  External: "info",
};

export function AuditTypeBadge({ type }: { type: AuditType }) {
  return <StatusBadge tone={typeTone[type]}>{type}</StatusBadge>;
}

export function AuditIntervalBadge({ interval }: { interval: AuditInterval }) {
  return <StatusBadge tone="neutral">{interval}</StatusBadge>;
}
