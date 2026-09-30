import { useMemo, useState, type FormEvent } from "react";
import { FormField, FormSection } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/toast";
import { useFunctionalUnitsQuery } from "@/modules/functional-units/hooks/use-functional-units";
import { useUsersQuery } from "@/modules/users/hooks/use-users";
import {
  createSupplierFormSchema,
  updateSupplierFormSchema,
} from "../schemas";
import type {
  CreateSupplierInput,
  Supplier,
  UpdateSupplierInput,
} from "../types";

type FieldErrors = Record<string, string>;

type SupplierFormProps = {
  mode: "create" | "edit";
  formId: string;
  pending?: boolean;
  hideActions?: boolean;
  initialSupplier?: Supplier;
  onSubmit: (
    values: CreateSupplierInput | UpdateSupplierInput
  ) => Promise<void> | void;
  onCancel?: () => void;
  submitLabel: string;
};

function toDateInput(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function SupplierForm({
  mode,
  formId,
  pending = false,
  hideActions = false,
  initialSupplier,
  onSubmit,
  onCancel,
  submitLabel,
}: SupplierFormProps) {
  const [name, setName] = useState(initialSupplier?.name ?? "");
  const [accountManager, setAccountManager] = useState(
    initialSupplier?.accountManager ?? ""
  );
  const [accountNumber, setAccountNumber] = useState(
    initialSupplier?.accountNumber ?? ""
  );
  const [email, setEmail] = useState(initialSupplier?.email ?? "");
  const [serviceProvision, setServiceProvision] = useState(
    initialSupplier?.serviceProvision ?? ""
  );
  const [contractValue, setContractValue] = useState(
    initialSupplier?.contractValue != null
      ? String(initialSupplier.contractValue)
      : ""
  );
  const [contractStartDate, setContractStartDate] = useState(
    toDateInput(initialSupplier?.contractStartDate)
  );
  const [contractEndDate, setContractEndDate] = useState(
    toDateInput(initialSupplier?.contractEndDate)
  );
  const [reviewDate, setReviewDate] = useState(
    toDateInput(initialSupplier?.reviewDate)
  );
  const [businessUnitId, setBusinessUnitId] = useState(
    initialSupplier?.businessUnitId ?? ""
  );
  const [buyerId, setBuyerId] = useState(initialSupplier?.buyerId ?? "");
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

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFieldErrors({});

    if (mode === "create") {
      const parsed = createSupplierFormSchema.safeParse({
        name,
        accountManager,
        accountNumber,
        email,
        serviceProvision,
        contractValue,
        contractStartDate,
        businessUnitId,
        buyerId,
        contractEndDate,
        reviewDate,
      });
      if (!parsed.success) {
        const next: FieldErrors = {};
        for (const issue of parsed.error.issues) {
          const key = String(issue.path[0] ?? "form");
          if (!next[key]) next[key] = issue.message;
        }
        setFieldErrors(next);
        return;
      }
      try {
        await onSubmit({
          name: parsed.data.name,
          accountManager: parsed.data.accountManager,
          accountNumber: parsed.data.accountNumber,
          email: parsed.data.email,
          serviceProvision: parsed.data.serviceProvision,
          contractValue: parsed.data.contractValue,
          contractStartDate: parsed.data.contractStartDate,
          businessUnitId: parsed.data.businessUnitId,
          buyerId: parsed.data.buyerId,
          contractEndDate: parsed.data.contractEndDate ?? null,
          reviewDate: parsed.data.reviewDate ?? null,
        });
      } catch (error) {
        notify.fromError(error, "Unable to register supplier");
      }
      return;
    }

    const parsed = updateSupplierFormSchema.safeParse({
      name,
      accountManager,
      accountNumber,
      email,
      serviceProvision,
      contractValue,
      contractStartDate,
      buyerId,
      contractEndDate,
      reviewDate,
    });
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!next[key]) next[key] = issue.message;
      }
      setFieldErrors(next);
      return;
    }

    try {
      await onSubmit({
        name: parsed.data.name,
        accountManager: parsed.data.accountManager,
        accountNumber: parsed.data.accountNumber,
        email: parsed.data.email,
        serviceProvision: parsed.data.serviceProvision,
        contractValue: parsed.data.contractValue,
        contractStartDate: parsed.data.contractStartDate,
        buyerId: parsed.data.buyerId,
        contractEndDate: emptyToNull(String(parsed.data.contractEndDate ?? "")),
        reviewDate: emptyToNull(String(parsed.data.reviewDate ?? "")),
      });
    } catch (error) {
      notify.fromError(error, "Unable to update supplier");
    }
  }

  return (
    <form
      id={formId}
      className="space-y-6"
      onSubmit={(e) => void handleSubmit(e)}
      noValidate
    >
      <FormSection title="Supplier details">
        <FormField label="Supplier name" required error={fieldErrors.name}>
          <input
            className="ims-field"
            value={name}
            disabled={pending}
            onChange={(event) => setName(event.target.value)}
          />
        </FormField>
        <FormField
          label="Account manager"
          required
          error={fieldErrors.accountManager}
          description="Supplier-side contact name"
        >
          <input
            className="ims-field"
            value={accountManager}
            disabled={pending}
            onChange={(event) => setAccountManager(event.target.value)}
          />
        </FormField>
        <FormField
          label="Account number"
          required
          error={fieldErrors.accountNumber}
        >
          <input
            className="ims-field"
            value={accountNumber}
            disabled={pending}
            onChange={(event) => setAccountNumber(event.target.value)}
          />
        </FormField>
        <FormField label="Email" required error={fieldErrors.email}>
          <input
            type="email"
            className="ims-field"
            value={email}
            disabled={pending}
            onChange={(event) => setEmail(event.target.value)}
          />
        </FormField>
        <FormField
          label="Service provision"
          required
          error={fieldErrors.serviceProvision}
        >
          <textarea
            className="ims-field min-h-[5.5rem] py-2 leading-relaxed"
            value={serviceProvision}
            disabled={pending}
            onChange={(event) => setServiceProvision(event.target.value)}
          />
        </FormField>
      </FormSection>

      <FormSection title="Ownership & contract">
        <FormField
          label="Business unit"
          error={fieldErrors.businessUnitId}
          description={
            mode === "edit"
              ? "Business unit cannot be changed after create."
              : undefined
          }
        >
          <select
            className="ims-select"
            value={businessUnitId}
            disabled={pending || mode === "edit" || unitsQuery.isLoading}
            onChange={(event) => setBusinessUnitId(event.target.value)}
          >
            <option value="">Select business unit</option>
            {unitOptions.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.label}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Buyer" error={fieldErrors.buyerId}>
          <select
            className="ims-select"
            value={buyerId}
            disabled={pending || usersQuery.isLoading}
            onChange={(event) => setBuyerId(event.target.value)}
          >
            <option value="">Unassigned</option>
            {userOptions.map((user) => (
              <option key={user.id} value={user.id}>
                {user.label}
              </option>
            ))}
          </select>
        </FormField>
        <FormField
          label="Contract value (£)"
          required
          error={fieldErrors.contractValue}
        >
          <input
            type="number"
            min={0}
            step={1}
            className="ims-field"
            value={contractValue}
            disabled={pending}
            onChange={(event) => setContractValue(event.target.value)}
          />
        </FormField>
        <FormField
          label="Contract start"
          required
          error={fieldErrors.contractStartDate}
        >
          <input
            type="date"
            className="ims-field"
            value={contractStartDate}
            disabled={pending}
            onChange={(event) => setContractStartDate(event.target.value)}
          />
        </FormField>
        <FormField label="Contract end" error={fieldErrors.contractEndDate}>
          <input
            type="date"
            className="ims-field"
            value={contractEndDate}
            disabled={pending}
            onChange={(event) => setContractEndDate(event.target.value)}
          />
        </FormField>
        <FormField label="Review date" error={fieldErrors.reviewDate}>
          <input
            type="date"
            className="ims-field"
            value={reviewDate}
            disabled={pending}
            onChange={(event) => setReviewDate(event.target.value)}
          />
        </FormField>
      </FormSection>

      {!hideActions ? (
        <SupplierFormActions
          formId={formId}
          submitLabel={submitLabel}
          pending={pending}
          onCancel={onCancel}
        />
      ) : null}
    </form>
  );
}

export function SupplierFormActions({
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
    <div className="flex flex-wrap justify-end gap-2">
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
    </div>
  );
}
