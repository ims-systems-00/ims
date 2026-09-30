import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  CheckCircle2,
  Eye,
  Loader2,
  ListTodo,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { EmptyState } from "@/shared/components/empty-state";
import { EntityTableRow } from "@/shared/components/entity-table-row";
import { RowActionsMenu } from "@/shared/components/row-actions-menu";
import { SearchInput } from "@/shared/components/search-input";
import { PageHeader } from "@/shared/layout";
import { isApiClientError } from "@/shared/lib/http/errors";
import { notify } from "@/shared/lib/toast";
import { DEV_STUB_IDENTITY } from "@/security";
import { useUsersQuery, useUserQuery } from "@/modules/users/hooks/use-users";
import { TaskSheet, type TaskSheetMode } from "../components/task-sheet";
import {
  TaskPriorityBadge,
  TaskStatusBadge,
} from "../components/task-badges";
import {
  useCompleteTaskMutation,
  useDeleteTaskMutation,
  useTasksQuery,
} from "../hooks/use-tasks";
import {
  LIST_STATUS_PRESET_LABELS,
  LIST_STATUS_PRESETS,
  TASK_PRIORITIES,
  type ListStatusPreset,
  type TaskPriority,
} from "../types";

type PendingDelete = { id: string; label: string };
type PendingComplete = { id: string; label: string };

function AssigneeSummary({
  assignees,
}: {
  assignees: Array<{ userId: string }>;
}) {
  if (assignees.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }
  if (assignees.length === 1) {
    return <AssigneeName userId={assignees[0]!.userId} />;
  }
  return (
    <span className="text-muted-foreground">
      {assignees.length} assignees
    </span>
  );
}

function AssigneeName({ userId }: { userId: string }) {
  const query = useUserQuery(userId, Boolean(userId));
  return (
    <span className="truncate">
      {query.data?.user.name ?? userId.slice(0, 8)}
    </span>
  );
}

function formatDue(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * URL sheet state:
 * - `?create=1` → create sheet
 * - `?task=<id>` → view (edit is in-sheet local mode)
 */
export function TasksListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [statusPreset, setStatusPreset] = useState<ListStatusPreset | "">(
    ""
  );
  const [priority, setPriority] = useState<TaskPriority | "">("");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueBefore, setDueBefore] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(
    null
  );
  const [pendingComplete, setPendingComplete] =
    useState<PendingComplete | null>(null);

  const subjectId = DEV_STUB_IDENTITY.subjectId;

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 300);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  const createOpen = searchParams.get("create") === "1";
  const taskId = searchParams.get("task");
  const sheetOpen = createOpen || Boolean(taskId);
  const sheetMode: TaskSheetMode = createOpen
    ? "create"
    : editMode
      ? "edit"
      : "view";

  const queryParams = useMemo(
    () => ({
      page,
      pageSize: 10,
      search: search || undefined,
      statusPreset: statusPreset || undefined,
      priority: priority || undefined,
      assigneeId: assigneeId || undefined,
      dueBefore: dueBefore
        ? new Date(`${dueBefore}T23:59:59.999Z`).toISOString()
        : undefined,
      sort: "dueDate" as const,
      sortDir: "asc" as const,
    }),
    [page, search, statusPreset, priority, assigneeId, dueBefore]
  );

  const listQuery = useTasksQuery(queryParams);
  const usersQuery = useUsersQuery({ page: 1, pageSize: 100 });
  const deleteMutation = useDeleteTaskMutation();
  const completeMutation = useCompleteTaskMutation();

  const hasFilters = Boolean(
    search || statusPreset || priority || assigneeId || dueBefore
  );

  function openCreate() {
    setEditMode(false);
    setSearchParams({ create: "1" });
  }

  function openTask(id: string) {
    setEditMode(false);
    setSearchParams({ task: id });
  }

  function closeSheet() {
    setEditMode(false);
    setSearchParams({});
  }

  function handleModeChange(mode: TaskSheetMode) {
    if (mode === "edit") {
      setEditMode(true);
      return;
    }
    if (mode === "view") {
      setEditMode(false);
    }
  }

  function clearFilters() {
    setSearchInput("");
    setSearch("");
    setStatusPreset("");
    setPriority("");
    setAssigneeId("");
    setDueBefore("");
    setPage(1);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const { id } = pendingDelete;
    try {
      await deleteMutation.mutateAsync(id);
      setPendingDelete(null);
      notify.success("Task deleted successfully");
      if (taskId === id) closeSheet();
    } catch (error) {
      setPendingDelete(null);
      notify.fromError(error, "Unable to delete task");
    }
  }

  async function confirmComplete() {
    if (!pendingComplete) return;
    const { id } = pendingComplete;
    try {
      await completeMutation.mutateAsync(id);
      setPendingComplete(null);
      notify.success("Task marked complete");
    } catch (error) {
      setPendingComplete(null);
      notify.fromError(error, "Unable to complete task");
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tasks"
        description="Create, assign, accept, and complete work items across the organisation."
        actions={
          <Button type="button" onClick={openCreate}>
            <Plus />
            Create task
          </Button>
        }
      />

      <div className="ims-toolbar">
        <SearchInput
          placeholder="Search reference, name, or description"
          aria-label="Search tasks"
          containerClassName="min-w-[16rem] flex-1"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
        <select
          className="ims-select ims-field-sm w-auto min-w-[10rem]"
          value={statusPreset}
          aria-label="Filter by status preset"
          onChange={(event) => {
            setPage(1);
            setStatusPreset(event.target.value as ListStatusPreset | "");
          }}
        >
          <option value="">All statuses</option>
          {LIST_STATUS_PRESETS.map((preset) => (
            <option key={preset} value={preset}>
              {LIST_STATUS_PRESET_LABELS[preset]}
            </option>
          ))}
        </select>
        <select
          className="ims-select ims-field-sm w-auto min-w-[8rem]"
          value={priority}
          aria-label="Filter by priority"
          onChange={(event) => {
            setPage(1);
            setPriority(event.target.value as TaskPriority | "");
          }}
        >
          <option value="">All priorities</option>
          {TASK_PRIORITIES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <select
          className="ims-select ims-field-sm w-auto min-w-[10rem]"
          value={assigneeId}
          aria-label="Filter by assignee"
          onChange={(event) => {
            setPage(1);
            setAssigneeId(event.target.value);
          }}
        >
          <option value="">All assignees</option>
          {(usersQuery.data?.items ?? []).map((row) => (
            <option key={row.user.id} value={row.user.id}>
              {row.user.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          className="ims-field ims-field-sm w-auto"
          value={dueBefore}
          aria-label="Due before"
          onChange={(event) => {
            setPage(1);
            setDueBefore(event.target.value);
          }}
        />
        {hasFilters ? (
          <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
            Clear
          </Button>
        ) : null}
      </div>

      {listQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading tasks…
        </div>
      ) : null}

      {listQuery.isError ? <ErrorState error={listQuery.error} /> : null}

      {listQuery.isSuccess && listQuery.data.total === 0 ? (
        <EmptyState
          icon={<ListTodo />}
          title={
            hasFilters
              ? "No tasks match your filters"
              : "No tasks in the register yet"
          }
          description={
            hasFilters
              ? "Try clearing filters or adjusting your search."
              : "Create a task to start tracking assigned work."
          }
          action={
            hasFilters ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={clearFilters}
              >
                Clear filters
              </Button>
            ) : (
              <Button type="button" size="sm" onClick={openCreate}>
                <Plus />
                Create task
              </Button>
            )
          }
        />
      ) : null}

      {listQuery.isSuccess && listQuery.data.items.length > 0 ? (
        <div className="ims-table-wrap">
          <table className="ims-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Task</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Due</th>
                <th>Assignees</th>
                <th className="w-12 text-right">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {listQuery.data.items.map((task) => {
                const canDelete = task.createdBy === subjectId;
                const canComplete =
                  task.status !== "Complete" &&
                  (task.createdBy === subjectId ||
                    task.assignees.some((a) => a.userId === subjectId));

                return (
                  <EntityTableRow
                    key={task.id}
                    onOpen={() => openTask(task.id)}
                  >
                    <td className="font-mono text-xs text-muted-foreground">
                      {task.reference}
                    </td>
                    <td className="max-w-[16rem]">
                      <div className="truncate font-medium">{task.name}</div>
                      {task.teamPriority ? (
                        <div className="ims-text-meta">Team</div>
                      ) : null}
                    </td>
                    <td>
                      <TaskPriorityBadge priority={task.priority} />
                    </td>
                    <td>
                      <TaskStatusBadge status={task.status} />
                    </td>
                    <td className="text-muted-foreground whitespace-nowrap">
                      {formatDue(task.dueDate)}
                    </td>
                    <td className="max-w-[10rem]">
                      <AssigneeSummary assignees={task.assignees} />
                    </td>
                    <td className="text-right">
                      <RowActionsMenu
                        label={`Actions for ${task.name}`}
                        actions={[
                          {
                            id: "details",
                            label: "Details",
                            icon: <Eye />,
                            onSelect: () => openTask(task.id),
                          },
                          ...(canComplete
                            ? [
                                {
                                  id: "complete",
                                  label: "Complete",
                                  icon: <CheckCircle2 />,
                                  onSelect: () =>
                                    setPendingComplete({
                                      id: task.id,
                                      label: task.name,
                                    }),
                                },
                              ]
                            : []),
                          ...(canDelete
                            ? [
                                {
                                  id: "delete",
                                  label: "Delete",
                                  icon: <Trash2 />,
                                  variant: "destructive" as const,
                                  onSelect: () =>
                                    setPendingDelete({
                                      id: task.id,
                                      label: task.name,
                                    }),
                                },
                              ]
                            : []),
                        ]}
                      />
                    </td>
                  </EntityTableRow>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {listQuery.isSuccess && listQuery.data.totalPages > 1 ? (
        <div className="ims-pagination">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Previous
          </Button>
          <span className="ims-text-meta tabular-nums">
            Page {listQuery.data.page} of {listQuery.data.totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= listQuery.data.totalPages}
            onClick={() =>
              setPage((current) =>
                Math.min(listQuery.data.totalPages, current + 1)
              )
            }
          >
            Next
          </Button>
        </div>
      ) : null}

      <TaskSheet
        open={sheetOpen}
        mode={sheetMode}
        taskId={taskId}
        subjectId={subjectId}
        onOpenChange={(open) => {
          if (!open) closeSheet();
        }}
        onModeChange={handleModeChange}
        onCreated={() => notify.success("Task created successfully")}
        onDeleted={() => notify.success("Task deleted successfully")}
        onActionMessage={(message) => notify.success(message)}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Delete this task?"
        description={
          pendingDelete
            ? `“${pendingDelete.label}” will be removed from the register.`
            : "This task will be removed from the register."
        }
        confirmLabel="Delete task"
        pending={deleteMutation.isPending}
        onConfirm={() => void confirmDelete()}
      />

      <ConfirmDialog
        open={Boolean(pendingComplete)}
        onOpenChange={(open) => {
          if (!open) setPendingComplete(null);
        }}
        title="Mark task complete?"
        description={
          pendingComplete
            ? `“${pendingComplete.label}” will be locked from further edits.`
            : "Completed tasks cannot be edited."
        }
        confirmLabel="Mark complete"
        pending={completeMutation.isPending}
        onConfirm={() => void confirmComplete()}
      />
    </div>
  );
}

function ErrorState({ error }: { error: unknown }) {
  if (isApiClientError(error)) {
    if (error.status === 403 || error.code === "FORBIDDEN") {
      return (
        <p className="ims-alert ims-alert-error" role="alert">
          You do not have permission to view tasks.
        </p>
      );
    }
    return (
      <p className="ims-alert ims-alert-error" role="alert">
        {error.message}
      </p>
    );
  }
  return (
    <p className="ims-alert ims-alert-error" role="alert">
      Unable to load tasks.
    </p>
  );
}
