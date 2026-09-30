import { useMemo, useState, type FormEvent } from "react";
import { Button } from "@/shared/components/ui/button";
import { FormField } from "@/shared/components/form-field";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { notify } from "@/shared/lib/toast";
import {
  functionalUnitFormSchema,
  type FunctionalUnitFormValues,
} from "../schemas";
import {
  ACCESS_TYPES,
  isBusinessAccessType,
  isComplianceAccessType,
  type AccessType,
  type CreateFunctionalUnitInput,
} from "../types";

type FieldErrors = Partial<Record<keyof FunctionalUnitFormValues, string>>;

type FunctionalUnitFormProps = {
  mode: "create" | "edit";
  initialValues?: Partial<FunctionalUnitFormValues>;
  accessTypeLocked?: boolean;
  submitLabel: string;
  pending?: boolean;
  formId?: string;
  /** When true, submit/cancel render in the sheet footer via form attribute. */
  hideActions?: boolean;
  onSubmit: (values: CreateFunctionalUnitInput) => Promise<void> | void;
  onCancel?: () => void;
};

const defaults: FunctionalUnitFormValues = {
  name: "",
  accessType: "Internal business function",
  responsibility: "",
  operatingLocation: "",
  standards: "",
};

export function FunctionalUnitForm({
  mode,
  initialValues,
  accessTypeLocked = false,
  submitLabel,
  pending = false,
  formId = "functional-unit-form",
  hideActions = false,
  onSubmit,
  onCancel,
}: FunctionalUnitFormProps) {
  const [values, setValues] = useState<FunctionalUnitFormValues>({
    ...defaults,
    ...initialValues,
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const accessType = values.accessType as AccessType;
  const showLocation = isBusinessAccessType(accessType);
  const showStandards = isComplianceAccessType(accessType);
  const nameLabel = showStandards ? "Compliance body" : "Name";

  const helper = useMemo(() => {
    if (mode === "edit") {
      return "Access type cannot be changed after creation.";
    }
    return "Choose an access type, then complete the required fields.";
  }, [mode]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = functionalUnitFormSchema.safeParse(values);
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
      const payload: CreateFunctionalUnitInput = {
        name: parsed.data.name,
        accessType: parsed.data.accessType as AccessType,
        responsibility: parsed.data.responsibility,
      };
      if (showLocation && parsed.data.operatingLocation) {
        payload.operatingLocation = parsed.data.operatingLocation;
      }
      if (showStandards && parsed.data.standards) {
        payload.standards = parsed.data.standards;
      }
      await onSubmit(payload);
    } catch (error) {
      notify.fromError(error, "Unable to save functional unit");
    }
  }

  return (
    <form
      id={formId}
      className="space-y-4"
      onSubmit={handleSubmit}
      noValidate
    >
      <p className="text-[0.8125rem] text-muted-foreground">{helper}</p>

      <FormField
        label="Access type"
        htmlFor={`${formId}-accessType`}
        error={fieldErrors.accessType}
        required
      >
        <select
          id={`${formId}-accessType`}
          className="ims-select"
          value={values.accessType}
          disabled={accessTypeLocked || pending}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              accessType: event.target.value as AccessType,
            }))
          }
        >
          {ACCESS_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </FormField>

      <FormField
        label={nameLabel}
        htmlFor={`${formId}-name`}
        error={fieldErrors.name}
        required
      >
        <Input
          id={`${formId}-name`}
          value={values.name}
          disabled={pending}
          onChange={(event) =>
            setValues((current) => ({ ...current, name: event.target.value }))
          }
        />
      </FormField>

      {showLocation ? (
        <FormField
          label="Operating location"
          htmlFor={`${formId}-operatingLocation`}
          error={fieldErrors.operatingLocation}
        >
          <Input
            id={`${formId}-operatingLocation`}
            value={values.operatingLocation ?? ""}
            disabled={pending}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                operatingLocation: event.target.value,
              }))
            }
          />
        </FormField>
      ) : null}

      {showStandards ? (
        <FormField
          label="Standards"
          htmlFor={`${formId}-standards`}
          error={fieldErrors.standards}
        >
          <Input
            id={`${formId}-standards`}
            value={values.standards ?? ""}
            disabled={pending}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                standards: event.target.value,
              }))
            }
          />
        </FormField>
      ) : null}

      <FormField
        label="Responsibility"
        htmlFor={`${formId}-responsibility`}
        error={fieldErrors.responsibility}
        required
      >
        <Textarea
          id={`${formId}-responsibility`}
          value={values.responsibility}
          disabled={pending}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              responsibility: event.target.value,
            }))
          }
        />
      </FormField>

      {!hideActions ? (
        <div className="flex gap-2 pt-1">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : submitLabel}
          </Button>
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
        </div>
      ) : null}
    </form>
  );
}

type FunctionalUnitFormActionsProps = {
  formId?: string;
  submitLabel: string;
  pending?: boolean;
  onCancel: () => void;
};

/** Sticky sheet footer actions bound to the form via `form` attribute. */
export function FunctionalUnitFormActions({
  formId = "functional-unit-form",
  submitLabel,
  pending = false,
  onCancel,
}: FunctionalUnitFormActionsProps) {
  return (
    <>
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={onCancel}
      >
        Cancel
      </Button>
      <Button type="submit" form={formId} disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </Button>
    </>
  );
}
