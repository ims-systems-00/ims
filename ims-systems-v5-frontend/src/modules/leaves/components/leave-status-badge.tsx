import { Badge, type BadgeProps } from "@/shared/components/ui/badge";
import type { LeaveStatus } from "../types";

const STATUS_VARIANT: Record<LeaveStatus, BadgeProps["variant"]> = {
  Draft: "muted",
  Pending: "warning",
  Ongoing: "info",
  Approved: "success",
  Rejected: "destructive",
};

export function LeaveStatusBadge({ status }: { status: LeaveStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{status}</Badge>;
}
