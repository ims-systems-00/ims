import { useMemo, useState, type FormEvent } from "react";
import { FormField, FormSection } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { notify } from "@/shared/lib/toast";
import { useFunctionalUnitsQuery } from "@/modules/functional-units/hooks/use-functional-units";
import {
  businessPremiseFormSchema,
  type BusinessPremiseFormValues,
} from "../schemas";
import {
  PREMISE_LINKABLE_ACCESS_TYPE,
  type CreateBusinessPremiseInput,
} from "../types";

type FieldErrors = Partial<Record<keyof BusinessPremiseFormValues, string>>;

type BusinessPremiseFormProps = {
  mode: "create" | "edit";
  formId: string;
  pending?: boolean;
  hideActions?: boolean;
  initialValues?: Partial<BusinessPremiseFormValues>;
  onSubmit: (values: CreateBusinessPremiseInput) => Promise<void> | void;
  onCancel?: () => void;
  submitLabel: string;
};

const defaults: BusinessPremiseFormValues = {
  name: "",
  location: "",
  address: "",
  functionalUnitIds: [],
};

export function BusinessPremiseForm({
  mode,
  formId,
  pending = false,
  hideActions = false,
  initialValues,
  onSubmit,
  onCancel,
  submitLabel,
}: BusinessPremiseFormProps) {
  const [values, setValues] = useState<BusinessPremiseFormValues>({
    ...defaults,
    ...initialValues,
    functionalUnitIds: initialValues?.functionalUnitIds ?? [],
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const unitsQuery = useFunctionalUnitsQuery({
    page: 1,
    pageSize: 100,
    accessType: PREMISE_LINKABLE_ACCESS_TYPE,
  });

  const unitOptions = useMemo(
    () =>
      (unitsQuery.data?.items ?? []).filter(
        (unit) => unit.accessType === PREMISE_LINKABLE_ACCESS_TYPE
      ),
    [unitsQuery.data]
  );

  function toggleUnit(id: string) {
    setValues((current) => {
      const exists = current.functionalUnitIds.includes(id);
      return {
        ...current,
        functionalUnitIds: exists
          ? current.functionalUnitIds.filter((unitId) => unitId !== id)
          : [...current.functionalUnitIds, id],
      };
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = businessPremiseFormSchema.safeParse(values);
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !next[key as keyof FieldErrors]) {
          next[key as keyof FieldErrors] = issue.message;
        }
      }
      setFieldErrors(next);
      return;
    }
    setFieldErrors({});
    try {
      await onSubmit({
        name: parsed.data.name,
        location: parsed.data.location,
        address: parsed.data.address,
        functionalUnitIds: parsed.data.functionalUnitIds,
      });
    } catch (error) {
      notify.fromError(error, "Unable to save Business Premise");
    }
  }

  return (
    <form
      id={formId}
      className="space-y-4"
      onSubmit={handleSubmit}
      noValidate
    >
      <p className="text-[0.8125rem] text-muted-foreground">
        {mode === "create"
          ? "Register a physical site and link Internal business function units that operate there."
          : "Update site details and the linked Functional Units list."}
      </p>

      <FormSection title="Site details">
        <FormField
          label="Name"
          htmlFor={`${formId}-name`}
          error={fieldErrors.name}
          required
        >
          <Input
            id={`${formId}-name`}
            value={values.name}
            disabled={pending}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                name: event.target.value,
              }))
            }
          />
        </FormField>

        <FormField
          label="Location"
          htmlFor={`${formId}-location`}
          error={fieldErrors.location}
          required
        >
          <Input
            id={`${formId}-location`}
            value={values.location}
            disabled={pending}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                location: event.target.value,
              }))
            }
          />
        </FormField>

        <FormField
          label="Address"
          htmlFor={`${formId}-address`}
          error={fieldErrors.address}
          required
        >
          <Textarea
            id={`${formId}-address`}
            rows={3}
            value={values.address}
            disabled={pending}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                address: event.target.value,
              }))
            }
          />
        </FormField>
      </FormSection>

      <FormSection title="Functional units">
        <FormField
          label="Linked units"
          htmlFor={`${formId}-units`}
          error={fieldErrors.functionalUnitIds}
          required
          description="Only Internal business function units can be linked."
        >
          {unitsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading units…</p>
          ) : unitOptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No Internal business function units are available.
            </p>
          ) : (
            <ul
              id={`${formId}-units`}
              className="max-h-48 space-y-1.5 overflow-y-auto rounded-sm border border-border-subtle p-2"
              role="group"
              aria-label="Linked Functional Units"
            >
              {unitOptions.map((unit) => {
                const checked = values.functionalUnitIds.includes(unit.id);
                return (
                  <li key={unit.id}>
                    <label className="flex cursor-pointer items-start gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted/60">
                      <input
                        type="checkbox"
                        className="mt-0.5 size-3.5 accent-primary"
                        checked={checked}
                        disabled={pending}
                        onChange={() => toggleUnit(unit.id)}
                      />
                      <span className="min-w-0">
                        <span className="block font-medium">{unit.name}</span>
                        {unit.operatingLocation ? (
                          <span className="block text-[0.75rem] text-muted-foreground">
                            {unit.operatingLocation}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </FormField>
      </FormSection>

      {!hideActions ? (
        <BusinessPremiseFormActions
          formId={formId}
          submitLabel={submitLabel}
          pending={pending}
          onCancel={onCancel}
        />
      ) : null}
    </form>
  );
}

export function BusinessPremiseFormActions({
  formId,
  submitLabel,
  pending = false,
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
