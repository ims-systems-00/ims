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
  useCreateRiskMutation,
  useDeleteRiskMutation,
  useEscalateRiskMutation,
  useNudgeRiskMutation,
  useRiskQuery,
  useUpdateRiskMutation,
} from "../hooks/use-risks";
import type { CreateRiskInput, UpdateRiskInput } from "../types";
import { RiskDetails, RiskDetailsLoading, RiskFormActions } from "./risk-details";
import { RiskForm } from "./risk-form";
import { RiskLifecyclePanel } from "./risk-lifecycle-panel";
import { RiskLinkedControls } from "./risk-linked-controls";
import { RiskRelatedTasks } from "./risk-related-tasks";

export type RiskSheetMode = "create" | "view" | "edit";

type RiskSheetProps = {
  open: boolean;
  mode: RiskSheetMode;
  riskId?: string | null;
  onOpenChange: (open: boolean) => void;
  onModeChange: (mode: RiskSheetMode) => void;
  onCreated?: () => void;
  onDeleted?: () => void;
  onActionMessage?: (message: string) => void;
};

export function RiskSheet({
  open,
  mode,
  riskId,
  onOpenChange,
  onModeChange,
  onCreated,
  onDeleted,
  onActionMessage,
}: RiskSheetProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [panelTab, setPanelTab] = useState("details");

  useEffect(() => {
    if (!open || mode !== "view") setPanelTab("details");
  }, [open, mode, riskId]);

  const riskQuery = useRiskQuery(mode === "create" ? undefined : (riskId ?? undefined));
  const createMutation = useCreateRiskMutation();
  const updateMutation = useUpdateRiskMutation(riskId ?? "");
  const deleteMutation = useDeleteRiskMutation();
  const escalateMutation = useEscalateRiskMutation();
  const nudgeMutation = useNudgeRiskMutation();

  const risk = riskQuery.data;
  const pending =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    escalateMutation.isPending ||
    nudgeMutation.isPending;

  const mitigated = Boolean(risk?.mitigated.status);
  const escalated = Boolean(risk?.escalated.status);
  const nudgeCooling =
    risk?.nextNudgeAt != null &&
    new Date(risk.nextNudgeAt).getTime() > Date.now();
  const lockedFromSource = Boolean(
    risk?.source?.moduleType?.toLowerCase().includes("audit")
  );

  async function handleCreate(values: CreateRiskInput | UpdateRiskInput) {
    await createMutation.mutateAsync(values as CreateRiskInput);
    onCreated?.();
    onOpenChange(false);
  }

  async function handleUpdate(values: CreateRiskInput | UpdateRiskInput) {
    await updateMutation.mutateAsync(values as UpdateRiskInput);
    notify.success("Risk updated successfully");
    onModeChange("view");
  }

  async function confirmDelete() {
    if (!riskId) return;
    await deleteMutation.mutateAsync(riskId);
    setConfirmOpen(false);
    onDeleted?.();
    onOpenChange(false);
  }

  async function handleEscalate() {
    if (!riskId) return;
    try {
      await escalateMutation.mutateAsync(riskId);
      const message = "Risk escalated";
      onActionMessage?.(message);
      if (!onActionMessage) notify.success(message);
    } catch (error) {
      notify.fromError(error, "Unable to escalate risk");
    }
  }

  async function handleNudge() {
    if (!riskId) return;
    try {
      await nudgeMutation.mutateAsync(riskId);
      const message = "Owner nudged";
      onActionMessage?.(message);
      if (!onActionMessage) notify.success(message);
    } catch (error) {
      notify.fromError(error, "Unable to nudge owner");
    }
  }

  const title =
    mode === "create"
      ? "Raise risk"
      : mode === "edit"
        ? "Edit risk"
        : risk
          ? risk.title
          : "Risk";

  const description =
    mode === "create"
      ? "Record a new organisational risk with score and ownership."
      : mode === "edit"
        ? mitigated
          ? "This risk is mitigated and cannot be edited."
          : "Update details, scoring, and treatment. Business unit stays fixed."
        : risk?.reference;

  const formId = mode === "create" ? "risk-create" : "risk-edit";

  return (
    <>
      <AppSheet
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        description={description}
        footer={
          mode === "create" ? (
            <RiskFormActions
              formId={formId}
              submitLabel="Raise risk"
              pending={pending}
              onCancel={() => onOpenChange(false)}
            />
          ) : mode === "edit" ? (
            mitigated ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => onModeChange("view")}
              >
                Back
              </Button>
            ) : (
              <RiskFormActions
                formId={formId}
                submitLabel="Save"
                pending={pending}
                onCancel={() => onModeChange("view")}
              />
            )
          ) : risk ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
              {!mitigated ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pending || !risk.ownerId || nudgeCooling}
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
                    onClick={() => setConfirmOpen(true)}
                  >
                    Delete
                  </Button>
                  <Button type="button" onClick={() => onModeChange("edit")}>
                    Edit
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={pending}
                  onClick={() => setConfirmOpen(true)}
                >
                  Delete
                </Button>
              )}
            </>
          ) : null
        }
      >
        {mode === "create" ? (
          <RiskForm
            mode="create"
            formId={formId}
            pending={pending}
            hideActions
            submitLabel="Raise risk"
            onSubmit={handleCreate}
          />
        ) : null}

        {mode !== "create" && riskQuery.isLoading ? (
          <RiskDetailsLoading />
        ) : null}

        {mode !== "create" && riskQuery.isError ? (
          <p className="ims-alert ims-alert-error" role="alert">
            {isApiClientError(riskQuery.error)
              ? riskQuery.error.message
              : "Unable to load risk"}
          </p>
        ) : null}

        {mode === "view" && risk ? (
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
            {panelTab === "details" ? <RiskDetails risk={risk} /> : null}
            {panelTab === "activity" ? (
              <ActivityTimeline
                moduleType="risks"
                moduleId={risk.id}
                title="Activity"
              />
            ) : null}
            {panelTab === "lifecycle" ? (
              <RiskLifecyclePanel risk={risk} />
            ) : null}
            {panelTab === "tasks" ? (
              <RiskRelatedTasks
                riskId={risk.id}
                businessUnitId={risk.businessUnitId}
                canLink={!mitigated}
              />
            ) : null}
            {panelTab === "controls" ? (
              <RiskLinkedControls risk={risk} canEdit={!mitigated} />
            ) : null}
          </>
        ) : null}

        {mode === "edit" && risk ? (
          mitigated ? (
            <p className="ims-alert ims-alert-info" role="status">
              This risk has been mitigated and cannot be updated.
            </p>
          ) : (
            <RiskForm
              mode="edit"
              formId={formId}
              pending={pending}
              hideActions
              initialRisk={risk}
              lockedFromSource={lockedFromSource}
              submitLabel="Save"
              onSubmit={handleUpdate}
            />
          )
        ) : null}
      </AppSheet>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete this risk?"
        description="The risk will be removed from the register. Linked tasks sourced from this risk will also be removed when Task Management is available."
        confirmLabel="Delete risk"
        pending={deleteMutation.isPending}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}
