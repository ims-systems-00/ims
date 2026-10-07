import { useEffect, useState } from "react";
import { AppSheet } from "@/shared/components/app-sheet";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { Button } from "@/shared/components/ui/button";
import { isApiClientError } from "@/shared/lib/http/errors";
import { notify } from "@/shared/lib/toast";
import { SheetPanelTabs } from "@/modules/activities";
import {
  useCreateSupplierMutation,
  useDeleteSupplierMutation,
  useSupplierQuery,
  useUpdateSupplierMutation,
} from "../hooks/use-suppliers";
import type { CreateSupplierInput, UpdateSupplierInput } from "../types";
import {
  SupplierDetails,
  SupplierDetailsLoading,
} from "./supplier-details";
import { SupplierForm, SupplierFormActions } from "./supplier-form";
import { SupplierKpiPanel } from "./supplier-kpi-panel";
import { SupplierRelatedIncidents } from "./supplier-related-incidents";
import { SupplierRelatedTasks } from "./supplier-related-tasks";

export type SupplierSheetMode = "create" | "view" | "edit";

type SupplierSheetProps = {
  open: boolean;
  mode: SupplierSheetMode;
  supplierId?: string | null;
  onOpenChange: (open: boolean) => void;
  onModeChange: (mode: SupplierSheetMode) => void;
  onCreated?: () => void;
  onDeleted?: () => void;
};

/**
 * Reusable create / view / edit sheet for Supplier records.
 */
export function SupplierSheet({
  open,
  mode,
  supplierId,
  onOpenChange,
  onModeChange,
  onCreated,
  onDeleted,
}: SupplierSheetProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [panelTab, setPanelTab] = useState("details");

  useEffect(() => {
    if (!open || mode !== "view") setPanelTab("details");
  }, [open, mode, supplierId]);

  const supplierQuery = useSupplierQuery(
    mode === "create" ? undefined : (supplierId ?? undefined)
  );
  const createMutation = useCreateSupplierMutation();
  const updateMutation = useUpdateSupplierMutation(supplierId ?? "");
  const deleteMutation = useDeleteSupplierMutation();

  const supplier = supplierQuery.data;
  const pending =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  async function handleCreate(
    values: CreateSupplierInput | UpdateSupplierInput
  ) {
    await createMutation.mutateAsync(values as CreateSupplierInput);
    onCreated?.();
    onOpenChange(false);
  }

  async function handleUpdate(
    values: CreateSupplierInput | UpdateSupplierInput
  ) {
    await updateMutation.mutateAsync(values as UpdateSupplierInput);
    notify.success("Supplier updated successfully");
    onModeChange("view");
  }

  async function confirmDelete() {
    if (!supplierId) return;
    try {
      await deleteMutation.mutateAsync(supplierId);
      setDeleteOpen(false);
      onDeleted?.();
      onOpenChange(false);
    } catch (error) {
      notify.fromError(error, "Unable to delete supplier");
    }
  }

  const title =
    mode === "create"
      ? "Register supplier"
      : mode === "edit"
        ? "Edit supplier"
        : supplier
          ? supplier.name
          : "Supplier";

  const description =
    mode === "create"
      ? "Record a third-party supplier with contract details and ownership."
      : mode === "edit"
        ? "Update supplier details. Business unit stays fixed. Attachments append via the details view."
        : supplier?.reference;

  const formId = mode === "create" ? "supplier-create" : "supplier-edit";

  return (
    <>
      <AppSheet
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        description={description}
        footer={
          mode === "create" ? (
            <SupplierFormActions
              formId={formId}
              submitLabel="Register supplier"
              pending={pending}
              onCancel={() => onOpenChange(false)}
            />
          ) : mode === "edit" ? (
            <SupplierFormActions
              formId={formId}
              submitLabel="Save"
              pending={pending}
              onCancel={() => onModeChange("view")}
            />
          ) : supplier ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Close
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
          ) : null
        }
      >
        {mode === "create" ? (
          <SupplierForm
            mode="create"
            formId={formId}
            pending={pending}
            hideActions
            submitLabel="Register supplier"
            onSubmit={handleCreate}
          />
        ) : null}

        {mode !== "create" && supplierQuery.isLoading ? (
          <SupplierDetailsLoading />
        ) : null}

        {mode !== "create" && supplierQuery.isError ? (
          <p className="ims-alert ims-alert-error" role="alert">
            {isApiClientError(supplierQuery.error)
              ? supplierQuery.error.message
              : "Unable to load supplier"}
          </p>
        ) : null}

        {mode === "view" && supplier ? (
          <>
            <SheetPanelTabs
              tabs={[
                { id: "details", label: "Details" },
                { id: "kpis", label: "KPI/Objectives" },
                { id: "incidents", label: "Incidents" },
                { id: "tasks", label: "Tasks" },
              ]}
              value={panelTab}
              onChange={setPanelTab}
            />
            {panelTab === "details" ? (
              <SupplierDetails supplier={supplier} />
            ) : null}
            {panelTab === "kpis" ? (
              <SupplierKpiPanel supplier={supplier} />
            ) : null}
            {panelTab === "incidents" ? (
              <SupplierRelatedIncidents
                supplierId={supplier.id}
                businessUnitId={supplier.businessUnitId}
              />
            ) : null}
            {panelTab === "tasks" ? (
              <SupplierRelatedTasks
                supplierId={supplier.id}
                businessUnitId={supplier.businessUnitId}
              />
            ) : null}
          </>
        ) : null}

        {mode === "edit" && supplier ? (
          <SupplierForm
            mode="edit"
            formId={formId}
            pending={pending}
            hideActions
            initialSupplier={supplier}
            submitLabel="Save"
            onSubmit={handleUpdate}
          />
        ) : null}
      </AppSheet>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this supplier?"
        description="The supplier will be removed from the register. Linked tasks sourced from this supplier will also be removed."
        confirmLabel="Delete supplier"
        pending={deleteMutation.isPending}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}

export { SupplierSheet as SupplierDetailsSheet };
