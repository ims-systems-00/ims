import { useMemo, useState, type FormEvent } from "react";
import { FormField, FormSection } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/toast";
import { useFunctionalUnitsQuery } from "@/modules/functional-units/hooks/use-functional-units";
import { useUsersQuery } from "@/modules/users/hooks/use-users";
import { createOfiFormSchema, updateOfiFormSchema } from "../schemas";
import type {
  CreateOfiInput,
  Ofi,
  UpdateOfiInput,
} from "../types";

type FieldErrors = Record<string, string>;

type OfiFormProps = {
  mode: "create" | "edit";
  formId: string;
  pending?: boolean;
  hideActions?: boolean;
  /** Audit-sourced OFIs lock title and description. */
  lockContent?: boolean;
  initialOfi?: Ofi;
  onSubmit: (values: CreateOfiInput | UpdateOfiInput) => Promise<void> | void;
  onCancel?: () => void;
  submitLabel: string;
};

function parseCost(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function OfiForm({
  mode,
  formId,
  pending = false,
  hideActions = false,
  lockContent = false,
  initialOfi,
  onSubmit,
  onCancel,
  submitLabel,
}: OfiFormProps) {
  const [title, setTitle] = useState(initialOfi?.title ?? "");
  const [opportunityForImprovement, setOpportunityForImprovement] = useState(
    initialOfi?.opportunityForImprovement ?? ""
  );
  const [ownerId, setOwnerId] = useState(initialOfi?.ownerId ?? "");
  const [businessUnitId, setBusinessUnitId] = useState(
    initialOfi?.businessUnitId ?? ""
  );
  const [cost, setCost] = useState(
    initialOfi?.cost != null ? String(initialOfi.cost) : ""
  );
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
      const parsed = createOfiFormSchema.safeParse({
        title,
        opportunityForImprovement,
        ownerId,
        businessUnitId,
        cost: cost === "" ? undefined : cost,
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
          title: parsed.data.title,
          opportunityForImprovement: parsed.data.opportunityForImprovement,
          ownerId: parsed.data.ownerId,
          businessUnitId: parsed.data.businessUnitId,
          cost: parseCost(String(parsed.data.cost ?? "")),
        });
      } catch (error) {
        notify.fromError(error, "Unable to raise OFI");
      }
      return;
    }

    const parsed = updateOfiFormSchema.safeParse({
      title,
      opportunityForImprovement,
      ownerId,
      cost: cost === "" ? undefined : cost,
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
        title: lockContent ? undefined : parsed.data.title,
        opportunityForImprovement: lockContent
          ? undefined
          : parsed.data.opportunityForImprovement,
        ownerId: parsed.data.ownerId,
        cost: cost === "" ? null : parseCost(cost) ?? null,
      });
    } catch (error) {
      notify.fromError(error, "Unable to update OFI");
    }
  }

  return (
    <form
      id={formId}
      className="space-y-6"
      onSubmit={(e) => void handleSubmit(e)}
      noValidate
    >
      <FormSection title="Improvement details">
        <FormField label="Title" required error={fieldErrors.title}>
          <input
            className="ims-field"
            value={title}
            disabled={pending || lockContent}
            onChange={(event) => setTitle(event.target.value)}
          />
        </FormField>
        <FormField
          label="Opportunity for improvement"
          required
          error={fieldErrors.opportunityForImprovement}
        >
          <textarea
            className="ims-field min-h-[7rem] py-2 leading-relaxed"
            value={opportunityForImprovement}
            disabled={pending || lockContent}
            onChange={(event) =>
              setOpportunityForImprovement(event.target.value)
            }
          />
        </FormField>
        {lockContent ? (
          <p className="ims-text-meta">
            Title and description are locked because this OFI was promoted from
            an audit.
          </p>
        ) : null}
      </FormSection>

      <FormSection title="Ownership">
        <FormField
          label="Business unit"
          required
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
        <FormField label="Owner" required={mode === "create"} error={fieldErrors.ownerId}>
          <select
            className="ims-select"
            value={ownerId}
            disabled={pending || usersQuery.isLoading}
            onChange={(event) => setOwnerId(event.target.value)}
          >
            <option value="">
              {mode === "create" ? "Select owner" : "Unassigned"}
            </option>
            {userOptions.map((user) => (
              <option key={user.id} value={user.id}>
                {user.label}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Estimated cost" error={fieldErrors.cost}>
          <input
            type="number"
            min={0}
            step={1}
            className="ims-field"
            value={cost}
            disabled={pending}
            placeholder="Optional"
            onChange={(event) => setCost(event.target.value)}
          />
        </FormField>
      </FormSection>

      {!hideActions ? (
        <OfiFormActions
          formId={formId}
          submitLabel={submitLabel}
          pending={pending}
          onCancel={onCancel}
        />
      ) : null}
    </form>
  );
}

export function OfiFormActions({
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
