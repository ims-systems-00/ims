import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { cn } from "@/shared/lib/utils";
import { notify } from "@/shared/lib/toast";
import { isApiClientError } from "@/shared/lib/http/errors";
import {
  TaskSheet,
  type TaskSheetMode,
} from "@/modules/tasks";
import {
  TaskPriorityBadge,
  TaskStatusBadge,
} from "@/modules/tasks/components/task-badges";
import {
  taskKeys,
  useCompleteTaskMutation,
  useTasksQuery,
} from "@/modules/tasks/hooks/use-tasks";
import type { Task } from "@/modules/tasks/types";
import { dashboardKeys } from "../hooks/use-dashboard";
import { DashboardEmptyState } from "./dashboard-panel";

const TODO_LIST_PARAMS = {
  statusPreset: "incomplete" as const,
  pageSize: 5,
  page: 1,
  sort: "dueDate" as const,
  sortDir: "asc" as const,
};

function formatDue(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isOverdue(task: Task): boolean {
  if (task.status === "Complete") return false;
  const due = new Date(task.dueDate);
  if (Number.isNaN(due.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due.getTime() < today.getTime();
}

/**
 * Embedded incomplete-task queue for the organisation live dashboard.
 */
export function DashboardTodoList() {
  const queryClient = useQueryClient();
  const listQuery = useTasksQuery(TODO_LIST_PARAMS);
  const completeMutation = useCompleteTaskMutation();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<TaskSheetMode>("create");
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [pendingComplete, setPendingComplete] = useState<Task | null>(null);

  const items = listQuery.data?.items ?? [];
  const total = listQuery.data?.total ?? 0;

  function openCreate() {
    setActiveTaskId(null);
    setSheetMode("create");
    setSheetOpen(true);
  }

  function openTask(id: string) {
    setActiveTaskId(id);
    setSheetMode("view");
    setSheetOpen(true);
  }

  async function refreshRelated() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() }),
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
    ]);
  }

  async function confirmComplete() {
    if (!pendingComplete) return;
    try {
      await completeMutation.mutateAsync(pendingComplete.id);
      notify.success("Task marked complete");
      setPendingComplete(null);
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    } catch (error) {
      notify.error(
        isApiClientError(error) ? error.message : "Unable to complete task"
      );
    }
  }

  if (listQuery.isLoading) {
    return (
      <div
        className="space-y-2"
        aria-busy="true"
        aria-label="Loading todo list"
      >
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-14 animate-pulse rounded-md border border-border-subtle bg-surface-muted/50"
          />
        ))}
      </div>
    );
  }

  if (listQuery.isError) {
    return (
      <p className="ims-alert ims-alert-error text-sm" role="alert">
        {isApiClientError(listQuery.error)
          ? listQuery.error.message
          : "Unable to load todo list."}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[0.75rem] text-muted-foreground">
          {total === 0
            ? "No open tasks"
            : `${total} incomplete task${total === 1 ? "" : "s"}`}
          {total > items.length ? ` · showing ${items.length}` : null}
        </p>
        <Button type="button" size="sm" variant="outline" onClick={openCreate}>
          <Plus className="size-3.5" aria-hidden />
          Add task
        </Button>
      </div>

      {items.length === 0 ? (
        <DashboardEmptyState
          title="No data available"
          description="Incomplete tasks will appear here. Create one to get started."
        />
      ) : (
        <ul className="space-y-2" aria-label="Todo list">
          {items.map((task) => {
            const overdue = isOverdue(task);
            return (
              <li key={task.id}>
                <div
                  className={cn(
                    "flex items-start gap-2 rounded-md border border-border-subtle bg-surface-muted/25 px-2.5 py-2.5",
                    "transition-colors hover:bg-surface-muted/45"
                  )}
                >
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    className="mt-0.5 shrink-0 text-muted-foreground hover:text-success"
                    aria-label={`Complete ${task.name}`}
                    disabled={completeMutation.isPending}
                    onClick={() => setPendingComplete(task)}
                  >
                    <Check className="size-3.5" aria-hidden />
                  </Button>
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                    onClick={() => openTask(task.id)}
                  >
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-[0.8125rem] font-medium text-foreground">
                        {task.name}
                      </span>
                      <TaskPriorityBadge priority={task.priority} />
                      <TaskStatusBadge status={task.status} />
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.6875rem] text-muted-foreground">
                      <span className="tabular-nums">{task.reference}</span>
                      <span
                        className={cn(
                          "tabular-nums",
                          overdue && "font-medium text-destructive"
                        )}
                      >
                        Due {formatDue(task.dueDate)}
                        {overdue ? " · Overdue" : ""}
                      </span>
                    </span>
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <TaskSheet
        open={sheetOpen}
        mode={sheetMode}
        taskId={activeTaskId}
        onOpenChange={setSheetOpen}
        onModeChange={setSheetMode}
        onCreated={() => {
          void refreshRelated();
        }}
        onDeleted={() => {
          void refreshRelated();
        }}
      />

      <ConfirmDialog
        open={Boolean(pendingComplete)}
        onOpenChange={(open) => {
          if (!open) setPendingComplete(null);
        }}
        title="Complete task?"
        description={
          pendingComplete
            ? `Mark “${pendingComplete.name}” as complete?`
            : "Mark this task as complete?"
        }
        confirmLabel="Complete"
        destructive={false}
        pending={completeMutation.isPending}
        onConfirm={() => {
          void confirmComplete();
        }}
      />
    </div>
  );
}
