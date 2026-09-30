import { useState } from "react";
import { AppSheet } from "@/shared/components/app-sheet";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { Button } from "@/shared/components/ui/button";
import { isApiClientError } from "@/shared/lib/http/errors";
import { notify } from "@/shared/lib/toast";
import {
  useAuditQuery,
  useCompleteAuditMutation,
  useCreateAuditMutation,
  useDeleteAuditMutation,
  useRemoveAuditAttachmentMutation,
  useUpdateAuditMutation,
} from "../hooks/use-audits";
import type {
  AuditType,
  CreateAuditInput,
  UpdateAuditInput,
} from "../types";
import { AuditDetails, AuditDetailsLoading } from "./audit-details";
import { AuditForm, AuditFormActions } from "./audit-form";

export type AuditSheetMode = "create" | "view" | "edit";

type AuditSheetProps = {
  open: boolean;
  mode: AuditSheetMode;
  auditId?: string | null;
  auditType: AuditType;
  onOpenChange: (open: boolean) => void;
  onModeChange: (mode: AuditSheetMode) => void;
  onCreated?: (count: number) => void;
  onDeleted?: () => void;
  onActionMessage?: (message: string) => void;
};

/**
 * Reusable create / view / edit sheet for Audits.
 */
export function AuditSheet({
  open,
  mode,
  auditId,
  auditType,
  onOpenChange,
  onModeChange,
  onCreated,
  onDeleted,
  onActionMessage,
}: AuditSheetProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [removingAttachmentId, setRemovingAttachmentId] = useState<
    string | null
  >(null);

  const auditQuery = useAuditQuery(
    mode === "create" ? undefined : (auditId ?? undefined)
  );
  const createMutation = useCreateAuditMutation();
  const updateMutation = useUpdateAuditMutation(auditId ?? "");
  const deleteMutation = useDeleteAuditMutation();
  const completeMutation = useCompleteAuditMutation();
  const removeAttachmentMutation = useRemoveAuditAttachmentMutation(
    auditId ?? ""
  );

  const audit = auditQuery.data;
  const pending =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    completeMutation.isPending ||
    removeAttachmentMutation.isPending;

  const completed = Boolean(audit?.completed.status);
  const canComplete =
    Boolean(audit) &&
    !completed &&
    audit != null &&
    new Date(audit.startDate).getTime() <= Date.now();

  async function handleCreate(values: CreateAuditInput | UpdateAuditInput) {
    const result = await createMutation.mutateAsync(values as CreateAuditInput);
    onCreated?.(result.items.length);
    onOpenChange(false);
  }

  async function handleUpdate(values: CreateAuditInput | UpdateAuditInput) {
    await updateMutation.mutateAsync(values as UpdateAuditInput);
    notify.success("Audit updated successfully");
    onModeChange("view");
  }

  async function confirmDelete() {
    if (!auditId) return;
    try {
      await deleteMutation.mutateAsync(auditId);
      setDeleteOpen(false);
      onDeleted?.();
      onOpenChange(false);
    } catch (error) {
      notify.fromError(error, "Unable to delete audit");
    }
  }

  async function confirmComplete() {
    if (!auditId) return;
    try {
      await completeMutation.mutateAsync(auditId);
      setCompleteOpen(false);
      const message = "Audit marked as completed";
      onActionMessage?.(message);
      if (!onActionMessage) notify.success(message);
      onModeChange("view");
    } catch (error) {
      notify.fromError(error, "Unable to complete audit");
    }
  }

  async function handleRemoveAttachment(attachmentId: string) {
    if (!auditId) return;
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
      ? `Schedule ${auditType.toLowerCase()} audit`
      : mode === "edit"
        ? "Edit audit"
        : audit
          ? audit.title
          : "Audit";

  const description =
    mode === "create"
      ? "Schedule one or more audits against a business unit and compliance body."
      : mode === "edit"
        ? completed
          ? "This audit is completed and cannot be edited."
          : "Update schedule details and summary. Auditor and interval stay fixed."
        : audit?.reference;

  const formId = mode === "create" ? "audit-create" : "audit-edit";

  return (
    <>
      <AppSheet
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        description={description}
        footer={
          mode === "create" ? (
            <AuditFormActions
              formId={formId}
              submitLabel="Schedule audit"
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
              <AuditFormActions
                formId={formId}
                submitLabel="Save"
                pending={pending}
                onCancel={() => onModeChange("view")}
              />
            )
          ) : audit ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
              {!completed ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={pending}
                    onClick={() => setDeleteOpen(true)}
                  >
                    Delete
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pending || !canComplete}
                    title={
                      !canComplete
                        ? "Cannot complete before the schedule date"
                        : undefined
                    }
                    onClick={() => setCompleteOpen(true)}
                  >
                    Complete
                  </Button>
                  <Button type="button" onClick={() => onModeChange("edit")}>
                    Edit
                  </Button>
                </>
              ) : null}
            </>
          ) : null
        }
      >
        {mode === "create" ? (
          <AuditForm
            mode="create"
            formId={formId}
            pending={pending}
            hideActions
            fixedType={auditType}
            submitLabel="Schedule audit"
            onSubmit={handleCreate}
          />
        ) : null}

        {mode !== "create" && auditQuery.isLoading ? (
          <AuditDetailsLoading />
        ) : null}

        {mode !== "create" && auditQuery.isError ? (
          <p className="ims-alert ims-alert-error" role="alert">
            {isApiClientError(auditQuery.error)
              ? auditQuery.error.message
              : "Unable to load audit"}
          </p>
        ) : null}

        {mode === "view" && audit ? (
          <AuditDetails
            audit={audit}
            onRemoveAttachment={
              !completed ? (id) => void handleRemoveAttachment(id) : undefined
            }
            removingAttachmentId={removingAttachmentId}
          />
        ) : null}

        {mode === "edit" && audit ? (
          completed ? (
            <p className="ims-alert ims-alert-info" role="status">
              This audit has been completed and cannot be updated.
            </p>
          ) : (
            <AuditForm
              mode="edit"
              formId={formId}
              pending={pending}
              hideActions
              fixedType={audit.type}
              initialAudit={audit}
              submitLabel="Save"
              onSubmit={handleUpdate}
            />
          )
        ) : null}
      </AppSheet>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this audit?"
        description="The audit will be removed from the register. Linked tasks sourced from this audit will also be removed."
        confirmLabel="Delete audit"
        pending={deleteMutation.isPending}
        onConfirm={() => void confirmDelete()}
      />

      <ConfirmDialog
        open={completeOpen}
        onOpenChange={setCompleteOpen}
        title="Complete this audit?"
        description="Findings will be promoted to Incidents and Risks. The audit will become read-only."
        confirmLabel="Mark completed"
        pending={completeMutation.isPending}
        onConfirm={() => void confirmComplete()}
      />
    </>
  );
}

export { AuditSheet as AuditDetailsSheet };
