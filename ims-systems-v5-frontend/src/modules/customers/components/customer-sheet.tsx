import { useState } from "react";
import { AppSheet } from "@/shared/components/app-sheet";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { Button } from "@/shared/components/ui/button";
import { isApiClientError } from "@/shared/lib/http/errors";
import { notify } from "@/shared/lib/toast";
import {
  useCreateCustomerMutation,
  useCustomerQuery,
  useDeleteCustomerMutation,
  useUpdateCustomerMutation,
} from "../hooks/use-customers";
import type {
  CreateCustomerInput,
  UpdateCustomerInput,
} from "../types";
import {
  CustomerDetails,
  CustomerDetailsLoading,
} from "./customer-details";
import { CustomerForm, CustomerFormActions } from "./customer-form";

export type CustomerSheetMode = "create" | "view" | "edit";

type CustomerSheetProps = {
  open: boolean;
  mode: CustomerSheetMode;
  customerId?: string | null;
  onOpenChange: (open: boolean) => void;
  onModeChange: (mode: CustomerSheetMode) => void;
  onCreated?: () => void;
  onDeleted?: () => void;
};

/**
 * Reusable create / view / edit sheet for Customer (CRM) records.
 */
export function CustomerSheet({
  open,
  mode,
  customerId,
  onOpenChange,
  onModeChange,
  onCreated,
  onDeleted,
}: CustomerSheetProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [goLiveOpen, setGoLiveOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<
    CreateCustomerInput | UpdateCustomerInput | null
  >(null);

  const customerQuery = useCustomerQuery(
    mode === "create" ? undefined : (customerId ?? undefined)
  );
  const createMutation = useCreateCustomerMutation();
  const updateMutation = useUpdateCustomerMutation(customerId ?? "");
  const deleteMutation = useDeleteCustomerMutation();

  const customer = customerQuery.data;
  const pending =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  async function submitCreate(values: CreateCustomerInput) {
    await createMutation.mutateAsync(values);
    onCreated?.();
    onOpenChange(false);
  }

  async function submitUpdate(values: UpdateCustomerInput) {
    await updateMutation.mutateAsync(values);
    notify.success("Customer updated successfully");
    onModeChange("view");
  }

  async function handleCreate(
    values: CreateCustomerInput | UpdateCustomerInput
  ) {
    const payload = values as CreateCustomerInput;
    if (payload.stage === "Live") {
      setPendingPayload(payload);
      setGoLiveOpen(true);
      return;
    }
    await submitCreate(payload);
  }

  async function handleUpdate(
    values: CreateCustomerInput | UpdateCustomerInput
  ) {
    const payload = values as UpdateCustomerInput;
    const becomingLive =
      payload.stage === "Live" && customer?.stage !== "Live";
    if (becomingLive) {
      setPendingPayload(payload);
      setGoLiveOpen(true);
      return;
    }
    await submitUpdate(payload);
  }

  async function confirmGoLive() {
    if (!pendingPayload) return;
    try {
      if (mode === "create") {
        await submitCreate(pendingPayload as CreateCustomerInput);
      } else {
        await submitUpdate(pendingPayload as UpdateCustomerInput);
      }
      setGoLiveOpen(false);
      setPendingPayload(null);
    } catch (error) {
      notify.fromError(error, "Unable to go live");
    }
  }

  async function confirmDelete() {
    if (!customerId) return;
    try {
      await deleteMutation.mutateAsync(customerId);
      setDeleteOpen(false);
      onDeleted?.();
      onOpenChange(false);
    } catch (error) {
      notify.fromError(error, "Unable to delete customer");
    }
  }

  const canDelete = customer && customer.stage !== "Live";

  const title =
    mode === "create"
      ? "Register customer"
      : mode === "edit"
        ? "Edit customer"
        : customer
          ? customer.name
          : "Customer";

  const description =
    mode === "create"
      ? "Add a prospect or live customer to the CRM register."
      : mode === "edit"
        ? "Update pipeline stage, contacts, and commercial details. Attachments append from the details view."
        : customer?.reference;

  const formId = mode === "create" ? "customer-create" : "customer-edit";
  const submitLabel =
    mode === "create"
      ? pendingPayload?.stage === "Live" || false
        ? "Go live"
        : "Register customer"
      : "Save";

  return (
    <>
      <AppSheet
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        description={description}
        footer={
          mode === "create" ? (
            <CustomerFormActions
              formId={formId}
              submitLabel="Register customer"
              pending={pending}
              onCancel={() => onOpenChange(false)}
            />
          ) : mode === "edit" ? (
            <CustomerFormActions
              formId={formId}
              submitLabel={submitLabel}
              pending={pending}
              onCancel={() => onModeChange("view")}
            />
          ) : customer ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
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
              <Button type="button" onClick={() => onModeChange("edit")}>
                Edit
              </Button>
            </>
          ) : null
        }
      >
        {mode === "create" ? (
          <CustomerForm
            mode="create"
            formId={formId}
            pending={pending}
            hideActions
            submitLabel="Register customer"
            onSubmit={handleCreate}
          />
        ) : null}

        {mode !== "create" && customerQuery.isLoading ? (
          <CustomerDetailsLoading />
        ) : null}

        {mode !== "create" && customerQuery.isError ? (
          <p className="ims-alert ims-alert-error" role="alert">
            {isApiClientError(customerQuery.error)
              ? customerQuery.error.message
              : "Unable to load customer"}
          </p>
        ) : null}

        {mode === "view" && customer ? (
          <CustomerDetails customer={customer} />
        ) : null}

        {mode === "edit" && customer ? (
          <CustomerForm
            mode="edit"
            formId={formId}
            pending={pending}
            hideActions
            initialCustomer={customer}
            submitLabel="Save"
            onSubmit={handleUpdate}
          />
        ) : null}
      </AppSheet>

      <ConfirmDialog
        open={goLiveOpen}
        onOpenChange={(openDialog) => {
          setGoLiveOpen(openDialog);
          if (!openDialog) setPendingPayload(null);
        }}
        title="Go live with this customer?"
        description="Moving to Live requires contract dates and unlocks live overview, invoices context, and incidents."
        confirmLabel="Go live"
        pending={pending}
        onConfirm={() => void confirmGoLive()}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this customer?"
        description="The customer will be removed from the register. Linked tasks sourced from this customer will also be removed."
        confirmLabel="Delete customer"
        pending={deleteMutation.isPending}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}

export { CustomerSheet as CustomerDetailsSheet };
export { CustomerSheet as CrmDetailsSheet };
