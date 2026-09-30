import { StatusBadge } from "@/shared/components/status-badge";
import type {
  ReviewDisplayStatus,
  ReviewInterval,
  ReviewPrivacy,
} from "../types";

const statusTone: Record<
  ReviewDisplayStatus,
  "neutral" | "success" | "warning" | "destructive" | "info"
> = {
  Scheduled: "info",
  Completed: "success",
};

export function ReviewStatusBadge({ status }: { status: ReviewDisplayStatus }) {
  return <StatusBadge tone={statusTone[status]}>{status}</StatusBadge>;
}

export function ReviewIntervalBadge({ interval }: { interval: ReviewInterval }) {
  return <StatusBadge tone="neutral">{interval}</StatusBadge>;
}

const privacyTone: Record<
  ReviewPrivacy,
  "neutral" | "success" | "warning" | "destructive" | "info"
> = {
  Organisational: "neutral",
  "Business unit": "info",
};

export function ReviewPrivacyBadge({ privacy }: { privacy: ReviewPrivacy }) {
  return <StatusBadge tone={privacyTone[privacy]}>{privacy}</StatusBadge>;
}
