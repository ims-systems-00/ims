import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { AppSheet } from "@/shared/components/app-sheet";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/toast";
import {
  ActivityTimeline,
  SheetPanelTabs,
} from "@/modules/activities";
import {
  useComplianceControlQuery,
  useControlEvidenceQuery,
  useUpdateControlStatusMutation,
} from "../hooks/use-compliance";
import {
  selectedDisplayLabel,
  toolkitDisplayLabel,
  type UpdateControlStatusInput,
} from "../types";
import { displayControlState } from "../types";
import { ControlEvidencePanel } from "./control-evidence-panel";
import { ControlStatusForm } from "./control-status-form";

type ControlSheetProps = {
  open: boolean;
  controlId: string | null;
  onOpenChange: (open: boolean) => void;
};

/**
 * Control detail sheet: Details / Activity / Compliance Evidence.
 */
export function ControlSheet({
  open,
  controlId,
  onOpenChange,
}: ControlSheetProps) {
  const [panelTab, setPanelTab] = useState("details");
  const controlQuery = useComplianceControlQuery(
    open ? (controlId ?? undefined) : undefined
  );
  const evidenceQuery = useControlEvidenceQuery(
    open && panelTab === "evidence" ? (controlId ?? undefined) : undefined,
    { page: 1, pageSize: 50 }
  );
  const updateMutation = useUpdateControlStatusMutation();

  useEffect(() => {
    if (!open) setPanelTab("details");
  }, [open, controlId]);

  const control = controlQuery.data;
  const hasIncompleteChildren =
    control?.isLocked && (control.childrenClauses?.length ?? 0) > 0;

  async function handleStatusUpdate(values: UpdateControlStatusInput) {
    if (!controlId) return;
    try {
      await updateMutation.mutateAsync({ id: controlId, body: values });
      notify.success("Control status updated");
    } catch (error) {
      notify.fromError(error, "Unable to update control status");
      throw error;
    }
  }

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title={control ? `${control.clause} - ${control.title}` : "Control"}
      description={
        control ? toolkitDisplayLabel(control.name) : undefined
      }
      className="sm:max-w-xl"
      footer={
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Close
        </Button>
      }
    >
      {controlQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading control…
        </div>
      ) : controlQuery.isError || !control ? (
        <p className="text-sm text-destructive">
          This control has been deleted or removed.
        </p>
      ) : (
        <>
          <SheetPanelTabs
            tabs={[
              { id: "details", label: "Details" },
              { id: "activity", label: "Activity" },
              { id: "evidence", label: "Compliance Evidence" },
            ]}
            value={panelTab}
            onChange={setPanelTab}
          />

          {panelTab === "details" ? (
            <div className="space-y-5">
              {control.description ? (
                <section className="space-y-1.5">
                  <h3 className="text-sm font-medium">Description</h3>
                  <div
                    className="prose prose-sm max-w-none text-sm text-muted-foreground"
                    dangerouslySetInnerHTML={{ __html: control.description }}
                  />
                </section>
              ) : null}

              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-md border border-border bg-surface-muted/40 px-3 py-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">ISO Standard</dt>
                  <dd className="font-medium">
                    {toolkitDisplayLabel(control.name)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Control</dt>
                  <dd className="font-medium tabular-nums">{control.clause}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Selected</dt>
                  <dd className="font-medium">
                    {selectedDisplayLabel(control.selected)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Status</dt>
                  <dd className="font-medium">
                    {displayControlState(control.state)}
                  </dd>
                </div>
              </dl>

              {hasIncompleteChildren ? (
                <div className="space-y-3 rounded-md border border-warning/30 bg-warning/10 px-3 py-3 text-sm text-foreground">
                  <p>
                    You cannot update the parent clause Select Control or Status
                    until all associated child clause fields have been
                    completed. Please ensure that every child clause is fully
                    filled out before proceeding with updates to the parent
                    clause.
                  </p>
                  <div>
                    <p className="font-medium">Child Clauses:</p>
                    <ul className="mt-1 list-inside list-disc text-muted-foreground">
                      {control.childrenClauses.map((clause) => (
                        <li key={clause} className="tabular-nums">
                          {clause}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : control.isLocked ? (
                <p className="rounded-md border border-border bg-surface-muted px-3 py-2 text-sm text-muted-foreground">
                  This parent/summary control is locked. Status is derived from
                  child clauses and cannot be updated manually.
                </p>
              ) : (
                <ControlStatusForm
                  key={`${control.id}-${control.selected}-${control.state}`}
                  control={control}
                  pending={updateMutation.isPending}
                  onSubmit={handleStatusUpdate}
                />
              )}

              {control.annex ? (
                <section className="space-y-1.5">
                  <h3 className="text-sm font-medium">Annex</h3>
                  <div
                    className="prose prose-sm max-w-none text-sm text-muted-foreground"
                    dangerouslySetInnerHTML={{ __html: control.annex }}
                  />
                </section>
              ) : null}
            </div>
          ) : null}

          {panelTab === "activity" ? (
            <ActivityTimeline
              moduleType="controlstatuses"
              moduleId={control.id}
            />
          ) : null}

          {panelTab === "evidence" ? (
            <ControlEvidencePanel
              controlStatusId={control.id}
              items={evidenceQuery.data?.items ?? []}
              isLoading={evidenceQuery.isLoading}
              isError={evidenceQuery.isError}
            />
          ) : null}
        </>
      )}
    </AppSheet>
  );
}
