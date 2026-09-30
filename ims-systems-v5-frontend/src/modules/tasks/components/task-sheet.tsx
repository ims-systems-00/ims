import { useState } from "react";
import { AppSheet } from "@/shared/components/app-sheet";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { Button } from "@/shared/components/ui/button";
import { isApiClientError } from "@/shared/lib/http/errors";
import { notify } from "@/shared/lib/toast";
import { DEV_STUB_IDENTITY } from "@/security";
import {
  useAcceptTaskMutation,
  useCompleteTaskMutation,
  useCreateTaskMutation,
  useDeclineTaskMutation,
  useDeleteTaskMutation,
  useNudgeTaskMutation,
  useRemoveTaskAttachmentMutation,
  useTaskQuery,
  useUpdateTaskMutation,
} from "../hooks/use-tasks";
import type {
  CreateTaskInput,
  Task,
  TaskSource,
  UpdateTaskInput,
} from "../types";
import { TaskDetails, TaskDetailsLoading } from "./task-details";
import { TaskForm, TaskFormActions } from "./task-form";

export type TaskSheetMode = "create" | "view" | "edit";

type TaskSheetProps = {
  open: boolean;
  mode: TaskSheetMode;
  taskId?: string | null;
  onOpenChange: (open: boolean) => void;
  onModeChange: (mode: TaskSheetMode) => void;
  onCreated?: () => void;
  onDeleted?: () => void;
  onActionMessage?: (message: string) => void;
  /** Override current subject for tests / future auth wiring. */
  subjectId?: string;
  /** Optional source link when creating a task from another module. */
  createSource?: TaskSource;
  /** Optional default business unit when creating from another module. */
  createBusinessUnitId?: string;
};

function isCreator(task: Task, subjectId: string): boolean {
  return task.createdBy === subjectId;
}

function isAssignee(task: Task, subjectId: string): boolean {
  return task.assignees.some((a) => a.userId === subjectId);
}

function pendingAssignee(task: Task, subjectId: string): boolean {
  return task.assignees.some(
    (a) => a.userId === subjectId && a.acceptance === "Pending"
  );
}

function nudgeCooling(task: Task): boolean {
  return (
    task.nextNudgeAt != null &&
    new Date(task.nextNudgeAt).getTime() > Date.now()
  );
}

/**
 * Reusable create / view / edit sheet for Tasks.
 * Prefer this from the Tasks list and any future module embeddings.
 */
export function TaskSheet({
  open,
  mode,
  taskId,
  onOpenChange,
  onModeChange,
  onCreated,
  onDeleted,
  onActionMessage,
  subjectId = DEV_STUB_IDENTITY.subjectId,
  createSource,
  createBusinessUnitId,
}: TaskSheetProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [removingAttachmentId, setRemovingAttachmentId] = useState<
    string | null
  >(null);

  const taskQuery = useTaskQuery(
    mode === "create" ? undefined : (taskId ?? undefined)
  );
  const createMutation = useCreateTaskMutation();
  const updateMutation = useUpdateTaskMutation(taskId ?? "");
  const deleteMutation = useDeleteTaskMutation();
  const acceptMutation = useAcceptTaskMutation();
  const declineMutation = useDeclineTaskMutation();
  const completeMutation = useCompleteTaskMutation();
  const nudgeMutation = useNudgeTaskMutation();
  const removeAttachmentMutation = useRemoveTaskAttachmentMutation(
    taskId ?? ""
  );

  const task = taskQuery.data;
  const pending =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    acceptMutation.isPending ||
    declineMutation.isPending ||
    completeMutation.isPending ||
    nudgeMutation.isPending ||
    removeAttachmentMutation.isPending;

  const completed = task?.status === "Complete";
  const creator = task ? isCreator(task, subjectId) : false;
  const assignee = task ? isAssignee(task, subjectId) : false;
  const canAcceptDecline = task
    ? !completed && pendingAssignee(task, subjectId)
    : false;
  const canComplete = task ? !completed && (creator || assignee) : false;
  const canDelete = task ? creator : false;
  const canEdit = task ? !completed : false;
  const canEditAssignment = task ? creator : true;
  const canNudge = task ? !completed && !nudgeCooling(task) : false;

  async function handleCreate(values: CreateTaskInput | UpdateTaskInput) {
    const payload: CreateTaskInput = {
      ...(values as CreateTaskInput),
      ...(createSource ? { source: createSource } : {}),
      ...(createBusinessUnitId && !(values as CreateTaskInput).businessUnitId
        ? { businessUnitId: createBusinessUnitId }
        : {}),
    };
    await createMutation.mutateAsync(payload);
    onCreated?.();
    onOpenChange(false);
  }

  async function handleUpdate(values: CreateTaskInput | UpdateTaskInput) {
    await updateMutation.mutateAsync(values as UpdateTaskInput);
    notify.success("Task updated successfully");
    onModeChange("view");
  }

  async function confirmDelete() {
    if (!taskId) return;
    try {
      await deleteMutation.mutateAsync(taskId);
      setDeleteOpen(false);
      onDeleted?.();
      onOpenChange(false);
    } catch (error) {
      notify.fromError(error, "Unable to delete task");
    }
  }

  async function confirmComplete() {
    if (!taskId) return;
    try {
      await completeMutation.mutateAsync(taskId);
      setCompleteOpen(false);
      const message = "Task marked complete";
      onActionMessage?.(message);
      if (!onActionMessage) notify.success(message);
    } catch (error) {
      notify.fromError(error, "Unable to complete task");
    }
  }

  async function handleAccept() {
    if (!taskId) return;
    try {
      await acceptMutation.mutateAsync(taskId);
      const message = "Assignment accepted";
      onActionMessage?.(message);
      if (!onActionMessage) notify.success(message);
    } catch (error) {
      notify.fromError(error, "Unable to accept assignment");
    }
  }

  async function handleDecline() {
    if (!taskId) return;
    try {
      await declineMutation.mutateAsync(taskId);
      const message = "Assignment declined";
      onActionMessage?.(message);
      if (!onActionMessage) notify.success(message);
    } catch (error) {
      notify.fromError(error, "Unable to decline assignment");
    }
  }

  async function handleNudge() {
    if (!taskId) return;
    try {
      await nudgeMutation.mutateAsync(taskId);
      const message = "Assignees nudged";
      onActionMessage?.(message);
      if (!onActionMessage) notify.success(message);
    } catch (error) {
      notify.fromError(error, "Unable to nudge assignees");
    }
  }

  async function handleRemoveAttachment(attachmentId: string) {
    if (!taskId) return;
    setRemovingAttachmentId(attachmentId);
    try {
      await removeAttachmentMutation.mutateAsync(attachmentId);
      notify.success("Attachment removed");
    } catch (error) {
      notify.fromError(error, "Unable to remove attachment");
    } finally {
      setRemovingAttachmentId(null);
    }
  }

  const title =
    mode === "create"
      ? "Create task"
      : mode === "edit"
        ? "Edit task"
        : task
          ? task.name
          : "Task";

  const description =
    mode === "create"
      ? "Define work, assign people or a unit, and set a due date."
      : mode === "edit"
        ? completed
          ? "Completed tasks cannot be edited."
          : "Update task details. Assignment fields are limited for non-creators."
        : task?.reference;

  const formId = mode === "create" ? "task-create" : "task-edit";

  return (
    <>
      <AppSheet
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        description={description}
        footer={
          mode === "create" ? (
            <TaskFormActions
              formId={formId}
              submitLabel="Create task"
              pending={pending}
              onCancel={() => onOpenChange(false)}
            />
          ) : mode === "edit" ? (
            completed ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => onModeChange("view")}
              >
                Back
              </Button>
            ) : (
              <TaskFormActions
                formId={formId}
                submitLabel="Save"
                pending={pending}
                onCancel={() => onModeChange("view")}
              />
            )
          ) : task ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
              {canAcceptDecline ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pending}
                    onClick={() => void handleDecline()}
                  >
                    Decline
                  </Button>
                  <Button
                    type="button"
                    disabled={pending}
                    onClick={() => void handleAccept()}
                  >
                    Accept
                  </Button>
                </>
              ) : null}
              {canNudge ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() => void handleNudge()}
                >
                  Nudge
                </Button>
              ) : null}
              {canComplete ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() => setCompleteOpen(true)}
                >
                  Complete
                </Button>
              ) : null}
              {canDelete ? (
                <Button
                  type="button"
                  variant="outline"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={pending}
                  onClick={() => setDeleteOpen(true)}
                >
                  Delete
                </Button>
              ) : null}
              {canEdit ? (
                <Button type="button" onClick={() => onModeChange("edit")}>
                  Edit
                </Button>
              ) : null}
            </>
          ) : null
        }
      >
        {mode === "create" ? (
          <TaskForm
            mode="create"
            formId={formId}
            pending={pending}
            hideActions
            submitLabel="Create task"
            onSubmit={handleCreate}
          />
        ) : null}

        {mode !== "create" && taskQuery.isLoading ? (
          <TaskDetailsLoading />
        ) : null}

        {mode !== "create" && taskQuery.isError ? (
          <p className="ims-alert ims-alert-error" role="alert">
            {isApiClientError(taskQuery.error)
              ? taskQuery.error.message
              : "Unable to load task"}
          </p>
        ) : null}

        {mode === "view" && task ? (
          <TaskDetails
            task={task}
            onRemoveAttachment={
              !completed ? (id) => void handleRemoveAttachment(id) : undefined
            }
            removingAttachmentId={removingAttachmentId}
          />
        ) : null}

        {mode === "edit" && task ? (
          completed ? (
            <p className="ims-alert ims-alert-info" role="status">
              This task is complete and cannot be updated.
            </p>
          ) : (
            <TaskForm
              mode="edit"
              formId={formId}
              pending={pending}
              hideActions
              initialTask={task}
              canEditAssignment={canEditAssignment}
              submitLabel="Save"
              onSubmit={handleUpdate}
            />
          )
        ) : null}
      </AppSheet>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this task?"
        description="The task will be removed from your register. This cannot be undone from the UI."
        confirmLabel="Delete task"
        pending={deleteMutation.isPending}
        onConfirm={() => void confirmDelete()}
      />

      <ConfirmDialog
        open={completeOpen}
        onOpenChange={setCompleteOpen}
        title="Mark task complete?"
        description="Completed tasks cannot be edited. Assignees will no longer be able to accept or decline."
        confirmLabel="Mark complete"
        pending={completeMutation.isPending}
        onConfirm={() => void confirmComplete()}
      />
    </>
  );
}

/** Alias matching the reusable details sheet naming used across modules. */
export { TaskSheet as TaskDetailsSheet };
