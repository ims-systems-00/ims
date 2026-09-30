import { StatusBadge } from "@/shared/components/status-badge";
import type { IncidentDisplayStatus, IncidentPriority } from "../types";

const statusTone: Record<
  IncidentDisplayStatus,
  "neutral" | "success" | "warning" | "destructive" | "info"
> = {
  Open: "info",
  Escalated: "warning",
  Resolved: "success",
};

export function IncidentStatusBadge({
  status,
}: {
  status: IncidentDisplayStatus;
}) {
  return <StatusBadge tone={statusTone[status]}>{status}</StatusBadge>;
}

const priorityTone: Record<
  IncidentPriority,
  "neutral" | "success" | "warning" | "destructive" | "info"
> = {
  P1: "destructive",
  P2: "warning",
  P3: "info",
  P4: "neutral",
};

export function IncidentPriorityBadge({
  priority,
}: {
  priority: IncidentPriority;
}) {
  return <StatusBadge tone={priorityTone[priority]}>{priority}</StatusBadge>;
}
