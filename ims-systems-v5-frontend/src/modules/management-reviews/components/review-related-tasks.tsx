import { useState } from "react";
import { Eye, Loader2, Plus } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { TaskSheet, type TaskSheetMode } from "@/modules/tasks";
import { useTasksQuery } from "@/modules/tasks/hooks/use-tasks";
import { MANAGEMENT_REVIEWS_SOURCE_MODULE } from "../types";

type ReviewRelatedTasksProps = {
  reviewId: string;
  businessUnitId?: string;
};

/**
 * Tasks linked via source.moduleType = managementreviews.
 */
export function ReviewRelatedTasks({
  reviewId,
  businessUnitId,
}: ReviewRelatedTasksProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);

  const tasksQuery = useTasksQuery({
    page: 1,
    pageSize: 20,
    sourceModuleType: MANAGEMENT_REVIEWS_SOURCE_MODULE,
    sourceModuleId: reviewId,
    sort: "dueDate",
    sortDir: "asc",
  });

  const sheetOpen = createOpen || Boolean(taskId);
  const sheetMode: TaskSheetMode = createOpen
    ? "create"
    : editMode
      ? "edit"
      : "view";

  function openCreate() {
    setEditMode(false);
    setTaskId(null);
    setCreateOpen(true);
  }

  function openTask(id: string) {
    setCreateOpen(false);
    setEditMode(false);
    setTaskId(id);
  }

  function closeSheet() {
    setCreateOpen(false);
    setEditMode(false);
    setTaskId(null);
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold tracking-tight">Linked tasks</h3>
        <Button type="button" size="sm" variant="outline" onClick={openCreate}>
          <Plus />
          Link task
        </Button>
      </div>

      {tasksQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading tasks…
        </div>
      ) : null}

      {tasksQuery.isError ? (
        <p className="ims-text-meta" role="alert">
          Unable to load linked tasks.
        </p>
      ) : null}

      {tasksQuery.isSuccess && tasksQuery.data.total === 0 ? (
        <p className="ims-text-meta">
          No tasks linked to this management review.
        </p>
      ) : null}

      {tasksQuery.isSuccess && tasksQuery.data.items.length > 0 ? (
        <ul className="space-y-2">
          {tasksQuery.data.items.map((task) => (
            <li
              key={task.id}
              className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{task.name}</p>
                <p className="ims-text-meta">
                  {task.reference} · {task.status}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                aria-label={`Open task ${task.name}`}
                onClick={() => openTask(task.id)}
              >
                <Eye />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      <TaskSheet
        open={sheetOpen}
        mode={sheetMode}
        taskId={taskId}
        createSource={{
          moduleType: MANAGEMENT_REVIEWS_SOURCE_MODULE,
          moduleId: reviewId,
        }}
        createBusinessUnitId={businessUnitId}
        onOpenChange={(open) => {
          if (!open) closeSheet();
        }}
        onModeChange={(mode) => {
          if (mode === "edit") setEditMode(true);
          if (mode === "view") setEditMode(false);
        }}
        onCreated={() => {
          void tasksQuery.refetch();
        }}
      />
    </section>
  );
}
