import { useState } from "react";
import { AppSheet } from "@/shared/components/app-sheet";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { Button } from "@/shared/components/ui/button";
import { isApiClientError } from "@/shared/lib/http/errors";
import { notify } from "@/shared/lib/toast";
import {
  useCreateIncidentMutation,
  useDeleteIncidentMutation,
  useEscalateIncidentMutation,
  useIncidentQuery,
  useNudgeIncidentMutation,
  useRemoveIncidentAttachmentMutation,
  useUpdateIncidentMutation,
} from "../hooks/use-incidents";
import type { CreateIncidentInput, IncidentSource, UpdateIncidentInput } from "../types";
import {
  IncidentDetails,
  IncidentDetailsLoading,
} from "./incident-details";
import { IncidentForm, IncidentFormActions } from "./incident-form";

export type IncidentSheetMode = "create" | "view" | "edit";

type IncidentSheetProps = {
  open: boolean;
  mode: IncidentSheetMode;
  incidentId?: string | null;
  onOpenChange: (open: boolean) => void;
  onModeChange: (mode: IncidentSheetMode) => void;
  onCreated?: () => void;
  onDeleted?: () => void;
  onActionMessage?: (message: string) => void;
  /** Optional source link when creating an incident from another module. */
  createSource?: IncidentSource;
  /** Optional default business unit when creating from another module. */
  createBusinessUnitId?: string;
};

/**
 * Reusable create / view / edit sheet for Incidents.
 */
export function IncidentSheet({
  open,
  mode,
  incidentId,
  onOpenChange,
  onModeChange,
  onCreated,
  onDeleted,
  onActionMessage,
  createSource,
  createBusinessUnitId,
}: IncidentSheetProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [removingAttachmentId, setRemovingAttachmentId] = useState<
    string | null
  >(null);

  const incidentQuery = useIncidentQuery(
    mode === "create" ? undefined : (incidentId ?? undefined)
  );
  const createMutation = useCreateIncidentMutation();
  const updateMutation = useUpdateIncidentMutation(incidentId ?? "");
  const deleteMutation = useDeleteIncidentMutation();
  const escalateMutation = useEscalateIncidentMutation();
  const nudgeMutation = useNudgeIncidentMutation();
  const removeAttachmentMutation = useRemoveIncidentAttachmentMutation(
    incidentId ?? ""
  );

  const incident = incidentQuery.data;
  const pending =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    escalateMutation.isPending ||
    nudgeMutation.isPending ||
    removeAttachmentMutation.isPending;

  const resolved = Boolean(incident?.resolved.status);
  const escalated = Boolean(incident?.escalated.status);
  const nudgeCooling =
    incident?.nextNudgeAt != null &&
    new Date(incident.nextNudgeAt).getTime() > Date.now();
  const lockedFromSource = Boolean(
    incident?.source?.moduleType?.toLowerCase().includes("audit")
  );

  async function handleCreate(values: CreateIncidentInput | UpdateIncidentInput) {
    const payload: CreateIncidentInput = {
      ...(values as CreateIncidentInput),
      ...(createSource ? { source: createSource } : {}),
      ...(createBusinessUnitId &&
      !(values as CreateIncidentInput).businessUnitId
        ? { businessUnitId: createBusinessUnitId }
        : {}),
    };
    await createMutation.mutateAsync(payload);
    onCreated?.();
    onOpenChange(false);
  }

  async function handleUpdate(values: CreateIncidentInput | UpdateIncidentInput) {
    await updateMutation.mutateAsync(values as UpdateIncidentInput);
    notify.success("Incident updated successfully");
    onModeChange("view");
  }

  async function confirmDelete() {
    if (!incidentId) return;
    try {
      await deleteMutation.mutateAsync(incidentId);
      setDeleteOpen(false);
      onDeleted?.();
      onOpenChange(false);
    } catch (error) {
      notify.fromError(error, "Unable to delete incident");
    }
  }

  async function handleEscalate() {
    if (!incidentId) return;
    try {
      await escalateMutation.mutateAsync(incidentId);
      const message = "Incident escalated";
      onActionMessage?.(message);
      if (!onActionMessage) notify.success(message);
    } catch (error) {
      notify.fromError(error, "Unable to escalate incident");
    }
  }

  async function handleNudge() {
    if (!incidentId) return;
    try {
      await nudgeMutation.mutateAsync(incidentId);
      const message = "Owner nudged";
      onActionMessage?.(message);
      if (!onActionMessage) notify.success(message);
    } catch (error) {
      notify.fromError(error, "Unable to nudge owner");
    }
  }

  async function handleRemoveAttachment(attachmentId: string) {
    if (!incidentId) return;
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
      ? "Raise incident"
      : mode === "edit"
        ? "Edit incident"
        : incident
          ? incident.title
          : "Incident";

  const description =
    mode === "create"
      ? "Log a new organisational incident with priority and ownership."
      : mode === "edit"
        ? resolved
          ? "This incident is resolved and cannot be edited."
          : "Update details and optionally mark as resolved. Business unit stays fixed."
        : incident?.reference;

  const formId = mode === "create" ? "incident-create" : "incident-edit";

  return (
    <>
      <AppSheet
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        description={description}
        footer={
          mode === "create" ? (
            <IncidentFormActions
              formId={formId}
              submitLabel="Raise incident"
              pending={pending}
              onCancel={() => onOpenChange(false)}
            />
          ) : mode === "edit" ? (
            resolved ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => onModeChange("view")}
              >
                Back
              </Button>
            ) : (
              <IncidentFormActions
                formId={formId}
                submitLabel="Save"
                pending={pending}
                onCancel={() => onModeChange("view")}
              />
            )
          ) : incident ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
              {!resolved ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pending || !incident.ownerId || nudgeCooling}
                    onClick={() => void handleNudge()}
                  >
                    Nudge
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pending || escalated}
                    onClick={() => void handleEscalate()}
                  >
                    Escalate
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={pending}
                    onClick={() => setDeleteOpen(true)}
                  >
                    Delete
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
          <IncidentForm
            mode="create"
            formId={formId}
            pending={pending}
            hideActions
            submitLabel="Raise incident"
            onSubmit={handleCreate}
          />
        ) : null}

        {mode !== "create" && incidentQuery.isLoading ? (
          <IncidentDetailsLoading />
        ) : null}

        {mode !== "create" && incidentQuery.isError ? (
          <p className="ims-alert ims-alert-error" role="alert">
            {isApiClientError(incidentQuery.error)
              ? incidentQuery.error.message
              : "Unable to load incident"}
          </p>
        ) : null}

        {mode === "view" && incident ? (
          <IncidentDetails
            incident={incident}
            onRemoveAttachment={
              !resolved ? (id) => void handleRemoveAttachment(id) : undefined
            }
            removingAttachmentId={removingAttachmentId}
          />
        ) : null}

        {mode === "edit" && incident ? (
          resolved ? (
            <p className="ims-alert ims-alert-info" role="status">
              This incident has been resolved and cannot be updated.
            </p>
          ) : (
            <IncidentForm
              mode="edit"
              formId={formId}
              pending={pending}
              hideActions
              initialIncident={incident}
              lockedFromSource={lockedFromSource}
              submitLabel="Save"
              onSubmit={handleUpdate}
            />
          )
        ) : null}
      </AppSheet>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this incident?"
        description="The incident will be removed from the register. Linked tasks sourced from this incident will also be removed."
        confirmLabel="Delete incident"
        pending={deleteMutation.isPending}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}

export { IncidentSheet as IncidentDetailsSheet };
