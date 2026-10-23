import { useState } from "react";
import {
  CalendarDays,
  CircleCheck,
  CircleX,
  Loader2,
  Pencil,
  Plus,
  Send,
  Trash2,
} from "lucide-react";
import { AppSheet } from "@/shared/components/app-sheet";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { FormField } from "@/shared/components/form-field";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { notify } from "@/shared/lib/toast";
import { formatDate } from "@/shared/lib/format-date";
import { useSessionSubjectId } from "@/security";
import {
  useCreateLeaveMutation,
  useDeleteLeaveMutation,
  useEvaluateLeaveMutation,
  useLeaveHolidaysQuery,
  useLeaveQuery,
  useSubmitLeaveMutation,
  useUpdateLeaveMutation,
} from "../hooks/use-leaves";
import { LEAVE_TYPES, type Leave, type LeaveDecision, type LeaveType } from "../types";
import { LeaveStatusBadge } from "./leave-status-badge";

export type LeaveSheetMode = "create" | "view";

type LeaveSheetProps = {
  open: boolean;
  mode: LeaveSheetMode;
  leaveId?: string | null;
  onOpenChange: (open: boolean) => void;
};

function toDateInput(value: string): string {
  return value.slice(0, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

type LeaveFormValues = {
  type: LeaveType;
  description: string;
  startDate: string;
  endDate: string;
  ongoing: boolean;
};

function initialValues(leave?: Leave): LeaveFormValues {
  if (!leave) {
    return {
      type: "Annual leave",
      description: "",
      startDate: today(),
      endDate: today(),
      ongoing: false,
    };
  }
  return {
    type: leave.type,
    description: leave.description,
    startDate: toDateInput(leave.startDate),
    endDate: toDateInput(leave.endDate),
    ongoing: leave.submission.status === "Ongoing",
  };
}

function validate(values: LeaveFormValues): string | null {
  if (!values.description.trim()) return "Add a description";
  if (!values.startDate || !values.endDate) return "Select start and end dates";
  if (values.endDate < values.startDate) {
    return "End date must be on or after start date";
  }
  return null;
}

function LeaveForm({
  leave,
  pending,
  onSave,
  onSaveAndSubmit,
  onCancel,
}: {
  leave?: Leave;
  pending: boolean;
  onSave: (values: LeaveFormValues) => void;
  onSaveAndSubmit?: (values: LeaveFormValues) => void;
  onCancel?: () => void;
}) {
  const [values, setValues] = useState(() => initialValues(leave));
  const isSick = values.type === "Sick leave";
  const canChangeOngoing = !leave;

  function patch(next: Partial<LeaveFormValues>) {
    setValues((current) => ({ ...current, ...next }));
  }

  function run(action: (values: LeaveFormValues) => void) {
    const message = validate(values);
    if (message) {
      notify.error(message);
      return;
    }
    action(values);
  }

  return (
    <div className="space-y-5">
      <FormField label="Leave type" htmlFor="leave-type" required>
        <select
          id="leave-type"
          className="ims-select"
          value={values.type}
          onChange={(e) => {
            const type = e.target.value as LeaveType;
            patch({
              type,
              ongoing: type === "Sick leave" ? values.ongoing : false,
            });
          }}
        >
          {LEAVE_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </FormField>

      {isSick && canChangeOngoing ? (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-3.5 rounded border-border"
            checked={values.ongoing}
            onChange={(e) => patch({ ongoing: e.target.checked })}
          />
          Ongoing leave
        </label>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Start date" htmlFor="leave-start" required>
          <Input
            id="leave-start"
            type="date"
            value={values.startDate}
            onChange={(e) => patch({ startDate: e.target.value })}
          />
        </FormField>
        <FormField label="End date" htmlFor="leave-end" required>
          <Input
            id="leave-end"
            type="date"
            value={values.endDate}
            min={values.startDate}
            onChange={(e) => patch({ endDate: e.target.value })}
          />
        </FormField>
      </div>

      <FormField label="Description" htmlFor="leave-description" required>
        <Textarea
          id="leave-description"
          rows={4}
          value={values.description}
          onChange={(e) => patch({ description: e.target.value })}
        />
      </FormField>

      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        <Button type="button" disabled={pending} onClick={() => run(onSave)}>
          {pending ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <Plus className="size-3.5" aria-hidden />
          )}
          {leave ? "Save changes" : values.ongoing ? "Save" : "Save draft"}
        </Button>
        {onSaveAndSubmit ? (
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() => run(onSaveAndSubmit)}
          >
            <Send className="size-3.5" aria-hidden />{" "}
            {values.ongoing
              ? "Save and send to manager"
              : "Request and submit"}
          </Button>
        ) : null}
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function HolidaysList({ countryCode }: { countryCode: string }) {
  const year = new Date().getUTCFullYear();
  const holidaysQuery = useLeaveHolidaysQuery(year, countryCode);

  if (holidaysQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  const items = holidaysQuery.data?.items ?? [];
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No public holidays found for {countryCode} in {year}.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-md border border-border text-sm">
      {items.map((holiday) => (
        <li
          key={`${holiday.date}-${holiday.name}`}
          className="flex justify-between gap-3 px-3 py-2.5"
        >
          <span>{holiday.name}</span>
          <span className="tabular-nums text-muted-foreground">
            {formatDate(holiday.date)}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Leave create / edit / view sheet with submit and approve / reject actions.
 */
export function LeaveSheet({
  open,
  mode,
  leaveId,
  onOpenChange,
}: LeaveSheetProps) {
  const leaveQuery = useLeaveQuery(
    leaveId ?? undefined,
    open && mode === "view" && Boolean(leaveId)
  );
  const createMutation = useCreateLeaveMutation();
  const updateMutation = useUpdateLeaveMutation();
  const submitMutation = useSubmitLeaveMutation();
  const evaluateMutation = useEvaluateLeaveMutation();
  const deleteMutation = useDeleteLeaveMutation();
  const subjectId = useSessionSubjectId();

  const [editing, setEditing] = useState(false);
  const [showHolidays, setShowHolidays] = useState(false);
  const [pendingDecision, setPendingDecision] =
    useState<LeaveDecision | null>(null);

  const leave = leaveQuery.data;
  const status = leave?.submission.status;
  const isOwner = Boolean(leave && subjectId && leave.createdBy === subjectId);
  const isLineManager = Boolean(
    leave && subjectId && leave.submission.lineManagerIds.includes(subjectId)
  );
  const isOpenForOwner = status === "Draft" || status === "Ongoing";
  const canSubmit = isOwner && isOpenForOwner;
  const canEdit = isOwner && isOpenForOwner;
  const canDelete = isOwner && status === "Draft";
  // Allow self-approval when the requester is also listed as a line manager (solo testing).
  const canEvaluate =
    isLineManager && (status === "Pending" || status === "Ongoing");

  function close() {
    setEditing(false);
    setShowHolidays(false);
    onOpenChange(false);
  }

  async function handleCreate(values: LeaveFormValues, submit: boolean) {
    try {
      await createMutation.mutateAsync({
        type: values.type,
        description: values.description.trim(),
        startDate: values.startDate,
        endDate: values.endDate,
        startDayFraction: 1,
        endDayFraction: 1,
        ...(values.ongoing ? { ongoing: true } : {}),
        ...(submit ? { submitImmediately: true } : {}),
      });
      notify.success(
        submit
          ? "Leave request submitted to your line manager successfully"
          : "Leave requested successfully"
      );
      onOpenChange(false);
    } catch (error) {
      notify.fromError(error, "Unable to create leave request");
    }
  }

  async function handleUpdate(values: LeaveFormValues) {
    if (!leave) return;
    try {
      await updateMutation.mutateAsync({
        id: leave.id,
        input: {
          type: values.type,
          description: values.description.trim(),
          startDate: values.startDate,
          endDate: values.endDate,
          startDayFraction: 1,
          endDayFraction: 1,
        },
      });
      notify.success("Leave request updated successfully");
      setEditing(false);
    } catch (error) {
      notify.fromError(error, "Unable to update leave request");
    }
  }

  async function handleSubmit() {
    if (!leave) return;
    try {
      await submitMutation.mutateAsync(leave.id);
      notify.success("Leave request submitted to your line manager successfully");
    } catch (error) {
      notify.fromError(error, "Unable to submit leave request");
    }
  }

  async function handleDelete() {
    if (!leave) return;
    try {
      await deleteMutation.mutateAsync(leave.id);
      notify.success("Leave request deleted successfully");
      close();
    } catch (error) {
      notify.fromError(error, "Unable to delete leave request");
    }
  }

  async function handleEvaluate() {
    if (!leave || !pendingDecision) return;
    try {
      await evaluateMutation.mutateAsync({
        id: leave.id,
        status: pendingDecision,
      });
      notify.success(
        pendingDecision === "Approved"
          ? "This leave request has been approved"
          : "This leave request has been rejected"
      );
      setPendingDecision(null);
    } catch (error) {
      notify.fromError(error, "Unable to evaluate leave request");
    }
  }

  return (
    <>
      <AppSheet
        open={open}
        onOpenChange={(next) => {
          if (!next) close();
          else onOpenChange(next);
        }}
        title={
          mode === "create" ? "Request leave" : (leave?.reference ?? "Leave")
        }
        description={
          mode === "create"
            ? "Request annual or sick leave and route it to your line managers."
            : "Review the request, then submit, approve or reject it."
        }
      >
        <div className="space-y-5">
          {mode === "create" ? (
            <LeaveForm
              pending={createMutation.isPending}
              onSave={(values) => void handleCreate(values, false)}
              onSaveAndSubmit={(values) => void handleCreate(values, true)}
            />
          ) : leaveQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !leave ? (
            <p className="text-sm text-destructive">Leave request not found.</p>
          ) : editing ? (
            <LeaveForm
              leave={leave}
              pending={updateMutation.isPending}
              onSave={(values) => void handleUpdate(values)}
              onCancel={() => setEditing(false)}
            />
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <LeaveStatusBadge status={leave.submission.status} />
                <span className="text-sm text-muted-foreground">
                  {leave.type}
                </span>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Working days</dt>
                  <dd className="mt-0.5 font-medium">{leave.days}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Country</dt>
                  <dd className="mt-0.5 font-medium">{leave.country.name}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Start</dt>
                  <dd className="mt-0.5 font-medium">
                    {formatDate(leave.startDate)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">End</dt>
                  <dd className="mt-0.5 font-medium">
                    {formatDate(leave.endDate)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Created</dt>
                  <dd className="mt-0.5 font-medium">
                    {formatDate(leave.createdOn)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Submitted</dt>
                  <dd className="mt-0.5 font-medium">
                    {formatDate(leave.submission.submissionDate)}
                  </dd>
                </div>
                {leave.submission.decisionDate ? (
                  <div>
                    <dt className="text-xs text-muted-foreground">Decision</dt>
                    <dd className="mt-0.5 font-medium">
                      {formatDate(leave.submission.decisionDate)}
                    </dd>
                  </div>
                ) : null}
              </dl>
              <div className="space-y-1.5">
                <p className="text-sm font-medium">Description</p>
                <p className="whitespace-pre-wrap rounded-md border border-border bg-surface-muted/30 px-3 py-2.5 text-sm leading-relaxed">
                  {leave.description}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                {canSubmit ? (
                  <Button
                    type="button"
                    size="sm"
                    disabled={submitMutation.isPending}
                    onClick={() => void handleSubmit()}
                  >
                    <Send className="size-3.5" aria-hidden /> Submit
                  </Button>
                ) : null}
                {canEvaluate ? (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setPendingDecision("Approved")}
                    >
                      <CircleCheck className="size-3.5" aria-hidden /> Approve
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setPendingDecision("Rejected")}
                    >
                      <CircleX className="size-3.5" aria-hidden /> Reject
                    </Button>
                  </>
                ) : null}
                {canEdit ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setEditing(true)}
                  >
                    <Pencil className="size-3.5" aria-hidden /> Edit
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setShowHolidays((current) => !current)}
                >
                  <CalendarDays className="size-3.5" aria-hidden /> Public
                  holidays
                </Button>
                {canDelete ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={deleteMutation.isPending}
                    onClick={() => void handleDelete()}
                  >
                    <Trash2 className="size-3.5" aria-hidden /> Delete
                  </Button>
                ) : null}
              </div>

              {showHolidays ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Public holidays</p>
                  <HolidaysList countryCode={leave.country.code} />
                </div>
              ) : null}
            </>
          )}
        </div>
      </AppSheet>

      <ConfirmDialog
        open={pendingDecision !== null}
        title={
          pendingDecision === "Approved"
            ? "Approve leave request?"
            : "Reject leave request?"
        }
        description={
          leave
            ? `${leave.reference}: ${formatDate(leave.startDate)} – ${formatDate(leave.endDate)} (${leave.days} working days).`
            : ""
        }
        confirmLabel={pendingDecision === "Approved" ? "Approve" : "Reject"}
        pending={evaluateMutation.isPending}
        onConfirm={() => void handleEvaluate()}
        onOpenChange={(next) => {
          if (!next) setPendingDecision(null);
        }}
      />
    </>
  );
}
