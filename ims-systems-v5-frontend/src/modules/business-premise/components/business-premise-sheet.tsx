import { useState } from "react";
import { AppSheet } from "@/shared/components/app-sheet";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { Button } from "@/shared/components/ui/button";
import { isApiClientError } from "@/shared/lib/http/errors";
import { notify } from "@/shared/lib/toast";
import {
  useBusinessPremiseQuery,
  useCreateBusinessPremiseMutation,
  useDeleteBusinessPremiseMutation,
  useUpdateBusinessPremiseMutation,
} from "../hooks/use-business-premises";
import type {
  BusinessPremise,
  CreateBusinessPremiseInput,
} from "../types";
import {
  BusinessPremiseDetails,
  BusinessPremiseDetailsLoading,
} from "./business-premise-details";
import {
  BusinessPremiseForm,
  BusinessPremiseFormActions,
} from "./business-premise-form";

export type BusinessPremiseSheetMode = "create" | "view" | "edit";

type BusinessPremiseSheetProps = {
  open: boolean;
  mode: BusinessPremiseSheetMode;
  premiseId?: string | null;
  onOpenChange: (open: boolean) => void;
  onModeChange: (mode: BusinessPremiseSheetMode) => void;
  onCreated?: (premise: BusinessPremise) => void;
  onDeleted?: () => void;
};

/**
 * Reusable create / view / edit sheet for Business Premise records.
 */
export function BusinessPremiseSheet({
  open,
  mode,
  premiseId,
  onOpenChange,
  onModeChange,
  onCreated,
  onDeleted,
}: BusinessPremiseSheetProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);

  const premiseQuery = useBusinessPremiseQuery(
    mode === "create" ? undefined : (premiseId ?? undefined)
  );
  const createMutation = useCreateBusinessPremiseMutation();
  const updateMutation = useUpdateBusinessPremiseMutation(premiseId ?? "");
  const deleteMutation = useDeleteBusinessPremiseMutation();

  const premise = premiseQuery.data;
  const pending =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  async function handleCreate(values: CreateBusinessPremiseInput) {
    const created = await createMutation.mutateAsync(values);
    onCreated?.(created);
  }

  async function handleUpdate(values: CreateBusinessPremiseInput) {
    await updateMutation.mutateAsync({
      name: values.name,
      location: values.location,
      address: values.address,
      functionalUnitIds: values.functionalUnitIds,
    });
    notify.success("Business Premise updated successfully");
    onModeChange("view");
  }

  async function confirmDelete() {
    if (!premiseId) return;
    try {
      await deleteMutation.mutateAsync(premiseId);
      setDeleteOpen(false);
      onDeleted?.();
      onOpenChange(false);
    } catch (error) {
      notify.fromError(error, "Unable to delete Business Premise");
    }
  }

  const title =
    mode === "create"
      ? "Create Business Premise"
      : mode === "edit"
        ? "Edit Business Premise"
        : (premise?.name ?? "Business Premise");

  const description =
    mode === "create"
      ? "Add a physical site linked to Internal business function units."
      : mode === "edit"
        ? "Update site details and linked Functional Units."
        : premise?.location;

  const formId = mode === "create" ? "bp-create-form" : "bp-edit-form";

  return (
    <>
      <AppSheet
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        description={description}
        footer={
          mode === "create" ? (
            <BusinessPremiseFormActions
              formId={formId}
              submitLabel="Create"
              pending={pending}
              onCancel={() => onOpenChange(false)}
            />
          ) : mode === "edit" ? (
            <BusinessPremiseFormActions
              formId={formId}
              submitLabel="Save"
              pending={pending}
              onCancel={() => onModeChange("view")}
            />
          ) : premise ? (
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
                variant="destructive"
                onClick={() => setDeleteOpen(true)}
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
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          )
        }
      >
        {mode === "create" ? (
          <BusinessPremiseForm
            mode="create"
            formId={formId}
            hideActions
            pending={pending}
            submitLabel="Create"
            onSubmit={handleCreate}
          />
        ) : null}

        {mode === "edit" && premise ? (
          <BusinessPremiseForm
            key={premise.id}
            mode="edit"
            formId={formId}
            hideActions
            pending={pending}
            submitLabel="Save"
            initialValues={{
              name: premise.name,
              location: premise.location,
              address: premise.address,
              functionalUnitIds: premise.functionalUnitIds,
            }}
            onSubmit={handleUpdate}
          />
        ) : null}

        {mode === "view" ? (
          premiseQuery.isLoading ? (
            <BusinessPremiseDetailsLoading />
          ) : premiseQuery.isError ? (
            <p className="ims-alert ims-alert-error" role="alert">
              {isApiClientError(premiseQuery.error)
                ? premiseQuery.error.message
                : "Unable to load Business Premise."}
            </p>
          ) : premise ? (
            <BusinessPremiseDetails premise={premise} />
          ) : null
        ) : null}
      </AppSheet>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this Business Premise?"
        description={
          premise
            ? `“${premise.name}” will be permanently removed from the organisation register.`
            : "This premise will be permanently deleted."
        }
        confirmLabel="Delete premise"
        pending={deleteMutation.isPending}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}
