import { StatusBadge } from "@/shared/components/status-badge";
import type { CustomerStage, CustomerStatus } from "../types";

export function CustomerStageBadge({ stage }: { stage: CustomerStage }) {
  const tone =
    stage === "Live"
      ? "success"
      : stage === "Proposal" || stage === "Qualified"
        ? "info"
        : stage === "Warm lead"
          ? "warning"
          : "neutral";
  return <StatusBadge tone={tone}>{stage}</StatusBadge>;
}

export function CustomerStatusBadge({ status }: { status: CustomerStatus }) {
  const tone =
    status === "Open"
      ? "info"
      : status === "Closed"
        ? "success"
        : status === "Lost"
          ? "destructive"
          : "warning";
  return <StatusBadge tone={tone}>{status}</StatusBadge>;
}
