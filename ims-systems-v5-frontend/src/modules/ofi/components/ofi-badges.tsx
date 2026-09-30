import { StatusBadge } from "@/shared/components/status-badge";
import type { OfiDisplayStatus } from "../types";

const statusTone: Record<
  OfiDisplayStatus,
  "neutral" | "success" | "warning" | "destructive" | "info"
> = {
  Pending: "neutral",
  "In Progress": "info",
  Implemented: "success",
};

export function OfiStatusBadge({ status }: { status: OfiDisplayStatus }) {
  return <StatusBadge tone={statusTone[status]}>{status}</StatusBadge>;
}
