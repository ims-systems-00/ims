import { useEffect, useState } from "react";
import { AppSheet } from "@/shared/components/app-sheet";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { Button } from "@/shared/components/ui/button";
import { isApiClientError } from "@/shared/lib/http/errors";
import { notify } from "@/shared/lib/toast";
import {
  ActivityTimeline,
  SheetPanelTabs,
} from "@/modules/activities";
import {
  useCreateOfiMutation,
  useDeleteOfiMutation,
  useImplementOfiMutation,
  useNudgeOfiMutation,
  useOfiQuery,
  useUpdateOfiMutation,
} from "../hooks/use-ofi";
import type { CreateOfiInput, UpdateOfiInput } from "../types";
import { OfiDetails, OfiDetailsLoading } from "./ofi-details";
import { OfiForm, OfiFormActions } from "./ofi-form";
import { OfiLifecyclePanel } from "./ofi-lifecycle-panel";
import { OfiLinkedControls } from "./ofi-linked-controls";
import { OfiRelatedTasks } from "./ofi-related-tasks";

export type OfiSheetMode = "create" | "view" | "edit";

type OfiSheetProps = {
  open: boolean;
  mode: OfiSheetMode;
  ofiId?: string | null;
  onOpenChange: (open: boolean) => void;
  onModeChange: (mode: OfiSheetMode) => void;
  onCreated?: () => void;
  onDeleted?: () => void;
  onActionMessage?: (message: string) => void;
};

/**
 * Reusable create / view / edit sheet for OFI records.
 */
export function OfiSheet({
  open,
  mode,
  ofiId,
  onOpenChange,
  onModeChange,
  onCreated,
  onDeleted,
  onActionMessage,
}: OfiSheetProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [implementOpen, setImplementOpen] = useState(false);
  const [panelTab, setPanelTab] = useState("details");

  useEffect(() => {
    if (!open || mode !== "view") setPanelTab("details");
  }, [open, mode, ofiId]);

  const ofiQuery = useOfiQuery(mode === "create" ? undefined : (ofiId ?? undefined));
  const createMutation = useCreateOfiMutation();
  const updateMutation = useUpdateOfiMutation(ofiId ?? "");
  const deleteMutation = useDeleteOfiMutation();
  const implementMutation = useImplementOfiMutation();
  const nudgeMutation = useNudgeOfiMutation();

  const ofi = ofiQuery.data;
  const pending =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    implementMutation.isPending ||
    nudgeMutation.isPending;

  const implemented = ofi?.implemented.status === "Implemented";
  const nudgeCooling =
    ofi?.nextNudgeAt != null &&
    new Date(ofi.nextNudgeAt).getTime() > Date.now();
  const lockContent = Boolean(
    ofi?.source?.moduleType?.toLowerCase().includes("audit")
  );

  async function handleCreate(values: CreateOfiInput | UpdateOfiInput) {
    await createMutation.mutateAsync(values as CreateOfiInput);
    onCreated?.();
    onOpenChange(false);
  }

  async function handleUpdate(values: CreateOfiInput | UpdateOfiInput) {
    await updateMutation.mutateAsync(values as UpdateOfiInput);
    notify.success("OFI updated successfully");
    onModeChange("view");
  }

  async function confirmDelete() {
    if (!ofiId) return;
    try {
      await deleteMutation.mutateAsync(ofiId);
      setDeleteOpen(false);
      onDeleted?.();
      onOpenChange(false);
    } catch (error) {
      notify.fromError(error, "Unable to delete OFI");
    }
  }

  async function confirmImplement() {
    if (!ofiId) return;
    try {
      await implementMutation.mutateAsync(ofiId);
      setImplementOpen(false);
      const message = "OFI marked as implemented";
      onActionMessage?.(message);
      if (!onActionMessage) notify.success(message);
      onModeChange("view");
    } catch (error) {
      notify.fromError(error, "Unable to implement OFI");
    }
  }

  async function handleNudge() {
    if (!ofiId) return;
    try {
      await nudgeMutation.mutateAsync(ofiId);
      const message = "Owner nudged";
      onActionMessage?.(message);
      if (!onActionMessage) notify.success(message);
    } catch (error) {
      notify.fromError(error, "Unable to nudge owner");
    }
  }

  const title =
    mode === "create"
      ? "Raise OFI"
      : mode === "edit"
        ? "Edit OFI"
        : ofi
          ? ofi.title
          : "OFI";

  const description =
    mode === "create"
      ? "Record a new opportunity for improvement with ownership and optional cost."
      : mode === "edit"
        ? implemented
          ? "This OFI is implemented and cannot be edited."
          : "Update details and ownership. Business unit stays fixed."
        : ofi?.reference;

  const formId = mode === "create" ? "ofi-create" : "ofi-edit";

  return (
    <>
      <AppSheet
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        description={description}
        footer={
          mode === "create" ? (
            <OfiFormActions
              formId={formId}
              submitLabel="Raise OFI"
              pending={pending}
              onCancel={() => onOpenChange(false)}
            />
          ) : mode === "edit" ? (
            implemented ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => onModeChange("view")}
              >
                Back
              </Button>
            ) : (
              <OfiFormActions
                formId={formId}
                submitLabel="Save"
                pending={pending}
                onCancel={() => onModeChange("view")}
              />
            )
          ) : ofi ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
              {!implemented ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pending || !ofi.ownerId || nudgeCooling}
                    title={
                      nudgeCooling
                        ? "Nudge cooldown is still active"
                        : !ofi.ownerId
                          ? "Assign an owner before nudging"
                          : undefined
                    }
                    onClick={() => void handleNudge()}
                  >
                    Nudge
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pending}
                    onClick={() => setImplementOpen(true)}
                  >
                    Implement
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
          <OfiForm
            mode="create"
            formId={formId}
            pending={pending}
            hideActions
            submitLabel="Raise OFI"
            onSubmit={handleCreate}
          />
        ) : null}

        {mode !== "create" && ofiQuery.isLoading ? <OfiDetailsLoading /> : null}

        {mode !== "create" && ofiQuery.isError ? (
          <p className="ims-alert ims-alert-error" role="alert">
            {isApiClientError(ofiQuery.error)
              ? ofiQuery.error.message
              : "Unable to load OFI"}
          </p>
        ) : null}

        {mode === "view" && ofi ? (
          <>
            <SheetPanelTabs
              tabs={[
                { id: "details", label: "Details" },
                { id: "activity", label: "Activity" },
                { id: "lifecycle", label: "Life Cycle" },
                { id: "tasks", label: "Tasks" },
                { id: "controls", label: "Linked controls" },
              ]}
              value={panelTab}
              onChange={setPanelTab}
            />
            {panelTab === "details" ? <OfiDetails ofi={ofi} /> : null}
            {panelTab === "activity" ? (
              <ActivityTimeline
                moduleType="cips"
                moduleId={ofi.id}
                readOnly={implemented}
                title="Activity"
                addLabel="Add comment"
                emptyTitle="No activities found"
                emptyDescription={
                  ofi.displayStatus === "Pending"
                    ? "The first activity moves this OFI from Pending to In Progress."
                    : "Comments and system events for this OFI will appear here."
                }
              />
            ) : null}
            {panelTab === "lifecycle" ? (
              <OfiLifecyclePanel ofi={ofi} />
            ) : null}
            {panelTab === "tasks" ? (
              <OfiRelatedTasks
                ofiId={ofi.id}
                businessUnitId={ofi.businessUnitId}
                canLink={!implemented}
              />
            ) : null}
            {panelTab === "controls" ? (
              <OfiLinkedControls ofi={ofi} canEdit={!implemented} />
            ) : null}
          </>
        ) : null}

        {mode === "edit" && ofi ? (
          implemented ? (
            <p className="ims-alert ims-alert-info" role="status">
              This OFI has been implemented and cannot be updated.
            </p>
          ) : (
            <OfiForm
              mode="edit"
              formId={formId}
              pending={pending}
              hideActions
              lockContent={lockContent}
              initialOfi={ofi}
              submitLabel="Save"
              onSubmit={handleUpdate}
            />
          )
        ) : null}
      </AppSheet>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this OFI?"
        description="The OFI will be removed from the register. Linked tasks sourced from this OFI will also be removed."
        confirmLabel="Delete OFI"
        pending={deleteMutation.isPending}
        onConfirm={() => void confirmDelete()}
      />

      <ConfirmDialog
        open={implementOpen}
        onOpenChange={setImplementOpen}
        title="Mark this OFI as implemented?"
        description="Implementation is final. The OFI will become read-only and cannot be deleted."
        confirmLabel="Mark implemented"
        pending={implementMutation.isPending}
        onConfirm={() => void confirmImplement()}
      />
    </>
  );
}

export { OfiSheet as OfiDetailsSheet };
