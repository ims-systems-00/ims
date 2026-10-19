import { StatusBadge } from "@/shared/components/status-badge";
import type { CampaignStatus } from "../types";

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  const tone =
    status === "Sent"
      ? "success"
      : status === "Queued"
        ? "warning"
        : "destructive";
  return <StatusBadge tone={tone}>{status}</StatusBadge>;
}
