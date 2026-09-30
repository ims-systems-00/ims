import { useMemo, useState, type FormEvent } from "react";
import { FormField, FormSection } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/toast";
import { useFunctionalUnitsQuery } from "@/modules/functional-units/hooks/use-functional-units";
import { useUsersQuery } from "@/modules/users/hooks/use-users";
import {
  createTaskFormSchema,
  updateTaskFormSchema,
} from "../schemas";
import type {
  AttachmentInput,
  CreateTaskInput,
  Task,
  TaskPriority,
  UpdateTaskInput,
} from "../types";
import { TASK_PRIORITIES } from "../types";

type FieldErrors = Record<string, string>;

type TaskFormProps = {
  mode: "create" | "edit";
  formId: string;
  pending?: boolean;
  hideActions?: boolean;
  initialTask?: Task;
  /** When false, assignment fields (priority, due, team, assignees) are read-only. */
  canEditAssignment?: boolean;
  onSubmit: (
    values: CreateTaskInput | UpdateTaskInput
  ) => Promise<void> | void;
  onCancel?: () => void;
  submitLabel: string;
};

function toDateInputValue(iso: string | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function toIsoDate(dateOnly: string): string {
  return new Date(`${dateOnly}T12:00:00.000Z`).toISOString();
}

export function TaskForm({
  mode,
  formId,
  pending = false,
  hideActions = false,
  initialTask,
  canEditAssignment = true,
  onSubmit,
  onCancel,
  submitLabel,
}: TaskFormProps) {
  const [name, setName] = useState(initialTask?.name ?? "");
  const [description, setDescription] = useState(
    initialTask?.description ?? ""
  );
  const [dueDate, setDueDate] = useState(
    toDateInputValue(initialTask?.dueDate) ||
      toDateInputValue(new Date().toISOString())
  );
  const [priority, setPriority] = useState<TaskPriority>(
    initialTask?.priority ?? "Medium"
  );
  const [teamPriority, setTeamPriority] = useState(
    Boolean(initialTask?.teamPriority)
  );
  const [businessUnitId, setBusinessUnitId] = useState(
    initialTask?.businessUnitId ?? ""
  );
  const [assigneeIds, setAssigneeIds] = useState<string[]>(
    initialTask?.assignees.map((a) => a.userId) ?? []
  );
  const [attachmentName, setAttachmentName] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<
    AttachmentInput[]
  >([]);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const usersQuery = useUsersQuery({ page: 1, pageSize: 100 });
  const unitsQuery = useFunctionalUnitsQuery({ page: 1, pageSize: 100 });

  const userOptions = useMemo(
    () =>
      (usersQuery.data?.items ?? []).map((row) => ({
        id: row.user.id,
        label: `${row.user.name} (${row.user.email})`,
      })),
    [usersQuery.data]
  );

  const unitOptions = useMemo(
    () =>
      (unitsQuery.data?.items ?? []).map((unit) => ({
        id: unit.id,
        label: unit.name,
      })),
    [unitsQuery.data]
  );

  function toggleAssignee(id: string) {
    if (!canEditAssignment) return;
    setAssigneeIds((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id]
    );
  }

  function addAttachment() {
    const fileName = attachmentName.trim();
    if (!fileName) return;
    setPendingAttachments((current) => [
      ...current,
      {
        fileName,
        url: attachmentUrl.trim() || undefined,
      },
    ]);
    setAttachmentName("");
    setAttachmentUrl("");
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFieldErrors({});

    const raw = {
      name,
      description,
      dueDate,
      priority,
      teamPriority,
      businessUnitId: teamPriority ? businessUnitId : "",
      assigneeIds: teamPriority ? [] : assigneeIds,
      attachments:
        pendingAttachments.length > 0 ? pendingAttachments : undefined,
    };

    const parsed =
      mode === "create"
        ? createTaskFormSchema.safeParse(raw)
        : updateTaskFormSchema.safeParse(raw);

    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!next[key]) next[key] = issue.message;
      }
      setFieldErrors(next);
      return;
    }

    const values = parsed.data;
    const payload: CreateTaskInput | UpdateTaskInput = {
      name: values.name,
      description: values.description,
      dueDate: toIsoDate(values.dueDate),
      priority: values.priority,
      teamPriority: values.teamPriority,
      businessUnitId: values.teamPriority
        ? values.businessUnitId
        : mode === "edit"
          ? null
          : undefined,
      assigneeIds: values.teamPriority ? undefined : values.assigneeIds,
      attachments: values.attachments,
    };

    try {
      await onSubmit(payload);
    } catch (error) {
      notify.fromError(
        error,
        mode === "create" ? "Unable to create task" : "Unable to update task"
      );
    }
  }

  const assignmentLocked = !canEditAssignment;

  return (
    <form id={formId} className="space-y-6" onSubmit={(e) => void handleSubmit(e)}>
      <FormSection title="Task details">
        <FormField
          label="Task name"
          htmlFor={`${formId}-name`}
          required
          error={fieldErrors.name}
        >
          <input
            id={`${formId}-name`}
            className="ims-field"
            value={name}
            disabled={pending}
            onChange={(event) => setName(event.target.value)}
            autoComplete="off"
          />
        </FormField>

        <FormField
          label="Description"
          htmlFor={`${formId}-description`}
          required
          error={fieldErrors.description}
        >
          <textarea
            id={`${formId}-description`}
            className="ims-field min-h-[6rem] py-2 leading-relaxed"
            value={description}
            disabled={pending}
            onChange={(event) => setDescription(event.target.value)}
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Due date"
            htmlFor={`${formId}-due`}
            required
            error={fieldErrors.dueDate}
          >
            <input
              id={`${formId}-due`}
              type="date"
              className="ims-field"
              value={dueDate}
              disabled={pending || assignmentLocked}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </FormField>

          <FormField
            label="Priority"
            htmlFor={`${formId}-priority`}
            error={fieldErrors.priority}
          >
            <select
              id={`${formId}-priority`}
              className="ims-select"
              value={priority}
              disabled={pending || assignmentLocked}
              onChange={(event) =>
                setPriority(event.target.value as TaskPriority)
              }
            >
              {TASK_PRIORITIES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </FormField>
        </div>
      </FormSection>

      <FormSection
        title="Assignment"
        description={
          assignmentLocked
            ? "Only the task creator can change assignment, priority, or due date."
            : "Team tasks assign everyone in a functional unit; individual tasks use selected assignees."
        }
      >
        <FormField label="Team task" htmlFor={`${formId}-team`}>
          <label className="flex items-center gap-2 text-sm">
            <input
              id={`${formId}-team`}
              type="checkbox"
              className="size-4 rounded-sm border-border"
              checked={teamPriority}
              disabled={pending || assignmentLocked}
              onChange={(event) => setTeamPriority(event.target.checked)}
            />
            Assign to a functional unit
          </label>
        </FormField>

        {teamPriority ? (
          <FormField
            label="Functional unit"
            htmlFor={`${formId}-unit`}
            required
            error={fieldErrors.businessUnitId}
          >
            <select
              id={`${formId}-unit`}
              className="ims-select"
              value={businessUnitId}
              disabled={pending || assignmentLocked || unitsQuery.isLoading}
              onChange={(event) => setBusinessUnitId(event.target.value)}
            >
              <option value="">Select a unit</option>
              {unitOptions.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.label}
                </option>
              ))}
            </select>
          </FormField>
        ) : (
          <FormField
            label="Assignees"
            error={fieldErrors.assigneeIds}
            description={
              usersQuery.isLoading
                ? "Loading users…"
                : userOptions.length === 0
                  ? "No users available to assign."
                  : undefined
            }
          >
            <ul className="max-h-48 space-y-2 overflow-y-auto rounded-sm border border-border-subtle p-2">
              {userOptions.map((user) => {
                const checked = assigneeIds.includes(user.id);
                return (
                  <li key={user.id}>
                    <label className="flex cursor-pointer items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="mt-0.5 size-4 rounded-sm border-border"
                        checked={checked}
                        disabled={pending || assignmentLocked}
                        onChange={() => toggleAssignee(user.id)}
                      />
                      <span>{user.label}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </FormField>
        )}
      </FormSection>

      <FormSection
        title="Attachments"
        description="File storage is not wired yet — add a display name and optional URL reference."
      >
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <FormField label="File name" htmlFor={`${formId}-att-name`}>
            <input
              id={`${formId}-att-name`}
              className="ims-field"
              value={attachmentName}
              disabled={pending}
              onChange={(event) => setAttachmentName(event.target.value)}
              placeholder="notes.pdf"
            />
          </FormField>
          <FormField label="URL (optional)" htmlFor={`${formId}-att-url`}>
            <input
              id={`${formId}-att-url`}
              className="ims-field"
              value={attachmentUrl}
              disabled={pending}
              onChange={(event) => setAttachmentUrl(event.target.value)}
              placeholder="https://"
            />
          </FormField>
          <div className="flex items-end">
            <Button
              type="button"
              variant="outline"
              disabled={pending || !attachmentName.trim()}
              onClick={addAttachment}
            >
              Add
            </Button>
          </div>
        </div>
        {pendingAttachments.length > 0 ? (
          <ul className="space-y-1 text-sm">
            {pendingAttachments.map((file, index) => (
              <li
                key={`${file.fileName}-${index}`}
                className="flex items-center justify-between gap-2 rounded-sm border border-border-subtle px-2 py-1.5"
              >
                <span className="truncate">{file.fileName}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    setPendingAttachments((current) =>
                      current.filter((_, i) => i !== index)
                    )
                  }
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
      </FormSection>

      {!hideActions ? (
        <div className="flex justify-end gap-2">
          {onCancel ? (
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={onCancel}
            >
              Cancel
            </Button>
          ) : null}
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : submitLabel}
          </Button>
        </div>
      ) : null}
    </form>
  );
}

export function TaskFormActions({
  formId,
  submitLabel,
  pending,
  onCancel,
}: {
  formId: string;
  submitLabel: string;
  pending?: boolean;
  onCancel?: () => void;
}) {
  return (
    <>
      {onCancel ? (
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={onCancel}
        >
          Cancel
        </Button>
      ) : null}
      <Button type="submit" form={formId} disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </Button>
    </>
  );
}
