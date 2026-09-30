import { StatusBadge } from "@/shared/components/status-badge";
import type {
  AssigneeAcceptance,
  TaskPriority,
  TaskStatus,
} from "../types";

const statusTone: Record<
  TaskStatus,
  "neutral" | "success" | "warning" | "destructive" | "info"
> = {
  Pending: "warning",
  "In progress": "info",
  Complete: "success",
};

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return <StatusBadge tone={statusTone[status]}>{status}</StatusBadge>;
}

const priorityTone: Record<
  TaskPriority,
  "neutral" | "success" | "warning" | "destructive" | "info"
> = {
  High: "destructive",
  Medium: "warning",
  Low: "neutral",
};

export function TaskPriorityBadge({ priority }: { priority: TaskPriority }) {
  return <StatusBadge tone={priorityTone[priority]}>{priority}</StatusBadge>;
}

const acceptanceTone: Record<
  AssigneeAcceptance,
  "neutral" | "success" | "warning" | "destructive" | "info"
> = {
  Pending: "warning",
  Accepted: "success",
  Declined: "destructive",
};

export function AssigneeAcceptanceBadge({
  acceptance,
}: {
  acceptance: AssigneeAcceptance;
}) {
  return (
    <StatusBadge tone={acceptanceTone[acceptance]}>{acceptance}</StatusBadge>
  );
}
