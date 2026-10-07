import { useState, type FormEvent } from "react";
import { Button } from "@/shared/components/ui/button";
import {
  CategorySelectField,
  assetCategoryToTagModule,
} from "@/modules/tags-and-categories";
import {
  hardwareFormSchema,
  informationFormSchema,
  peopleFormSchema,
  premiseFormSchema,
  softwareFormSchema,
  type HardwareFormValues,
  type InformationFormValues,
  type PeopleFormValues,
  type PremiseFormValues,
  type SoftwareFormValues,
} from "../schemas";
import type { AssetCategory } from "../types";
import { notify } from "@/shared/lib/toast";

type FieldErrors = Record<string, string>;

type AssetFormProps = {
  category: AssetCategory;
  mode: "create" | "edit";
  formId: string;
  pending?: boolean;
  hideActions?: boolean;
  initialValues?: Record<string, string | number | undefined>;
  onSubmit: (values: Record<string, unknown>) => Promise<void> | void;
  onCancel?: () => void;
  submitLabel: string;
};

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="ims-text-label block">{label}</span>
      {children}
      {error ? (
        <span className="text-xs text-destructive" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}

const inputClass = "ims-field";
const textareaClass = "ims-field min-h-[5rem] py-2 leading-relaxed";

export function AssetForm({
  category,
  mode,
  formId,
  pending = false,
  hideActions = false,
  initialValues,
  onSubmit,
  onCancel,
  submitLabel,
}: AssetFormProps) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const next: Record<string, string> = {};
    for (const [key, value] of Object.entries(initialValues ?? {})) {
      next[key] = value === undefined || value === null ? "" : String(value);
    }
    return next;
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function setField(key: string, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    let parsed:
      | { success: true; data: Record<string, unknown> }
      | { success: false; error: { issues: Array<{ path: PropertyKey[]; message: string }> } };

    switch (category) {
      case "hardware": {
        const result = hardwareFormSchema.safeParse(values as HardwareFormValues);
        parsed = result.success
          ? { success: true, data: result.data }
          : { success: false, error: result.error };
        break;
      }
      case "software": {
        const result = softwareFormSchema.safeParse(values as SoftwareFormValues);
        parsed = result.success
          ? { success: true, data: result.data }
          : { success: false, error: result.error };
        break;
      }
      case "people": {
        const result = peopleFormSchema.safeParse(values as PeopleFormValues);
        parsed = result.success
          ? { success: true, data: result.data }
          : { success: false, error: result.error };
        break;
      }
      case "premise": {
        const result = premiseFormSchema.safeParse(values as PremiseFormValues);
        parsed = result.success
          ? { success: true, data: result.data }
          : { success: false, error: result.error };
        break;
      }
      case "information": {
        const result = informationFormSchema.safeParse(
          values as InformationFormValues
        );
        parsed = result.success
          ? { success: true, data: result.data }
          : { success: false, error: result.error };
        break;
      }
    }

    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !next[key]) {
          next[key] = issue.message;
        }
      }
      setFieldErrors(next);
      return;
    }

    setFieldErrors({});
    const payload = { ...parsed.data };
    // Business unit is locked after create — never send on edit.
    if (mode === "edit") {
      delete payload.businessUnitId;
    }

    try {
      await onSubmit(payload);
    } catch (error) {
      notify.fromError(error, "Unable to save asset");
    }
  }

  return (
    <form id={formId} className="space-y-4" onSubmit={handleSubmit} noValidate>
      {mode === "edit" ? (
        <p className="text-sm text-muted-foreground">
          Business unit cannot be changed after creation.
        </p>
      ) : null}

      {category === "hardware" ? (
        <>
          <Field label="Asset name" error={fieldErrors.name}>
            <input
              className={inputClass}
              value={values.name ?? ""}
              disabled={pending}
              onChange={(e) => setField("name", e.target.value)}
            />
          </Field>
          <Field label="Owner id" error={fieldErrors.ownerId}>
            <input
              className={inputClass}
              value={values.ownerId ?? ""}
              disabled={pending}
              onChange={(e) => setField("ownerId", e.target.value)}
            />
          </Field>
          <Field label="Asset tag" error={fieldErrors.tag}>
            <input
              className={inputClass}
              value={values.tag ?? ""}
              disabled={pending}
              onChange={(e) => setField("tag", e.target.value)}
            />
          </Field>
          {mode === "create" ? (
            <Field label="Business unit id" error={fieldErrors.businessUnitId}>
              <input
                className={inputClass}
                value={values.businessUnitId ?? ""}
                disabled={pending}
                onChange={(e) => setField("businessUnitId", e.target.value)}
              />
            </Field>
          ) : null}
          <Field label="Assigned date" error={fieldErrors.assignedDate}>
            <input
              type="date"
              className={inputClass}
              value={toDateInput(values.assignedDate)}
              disabled={pending}
              onChange={(e) => setField("assignedDate", e.target.value)}
            />
          </Field>
          <Field label="Return date" error={fieldErrors.returnDate}>
            <input
              type="date"
              className={inputClass}
              value={toDateInput(values.returnDate)}
              disabled={pending}
              onChange={(e) => setField("returnDate", e.target.value)}
            />
          </Field>
          <Field label="Destruction date" error={fieldErrors.destructionDate}>
            <input
              type="date"
              className={inputClass}
              value={toDateInput(values.destructionDate)}
              disabled={pending}
              onChange={(e) => setField("destructionDate", e.target.value)}
            />
          </Field>
          <Field label="Cost" error={fieldErrors.cost}>
            <input
              type="number"
              min={0}
              step="0.01"
              className={inputClass}
              value={values.cost ?? ""}
              disabled={pending}
              onChange={(e) => setField("cost", e.target.value)}
            />
          </Field>
        </>
      ) : null}

      {category === "software" ? (
        <>
          <Field label="Software name" error={fieldErrors.name}>
            <input
              className={inputClass}
              value={values.name ?? ""}
              disabled={pending}
              onChange={(e) => setField("name", e.target.value)}
            />
          </Field>
          {mode === "create" ? (
            <Field label="Business unit id" error={fieldErrors.businessUnitId}>
              <input
                className={inputClass}
                value={values.businessUnitId ?? ""}
                disabled={pending}
                onChange={(e) => setField("businessUnitId", e.target.value)}
              />
            </Field>
          ) : null}
          <Field label="Licence count" error={fieldErrors.licenceCount}>
            <input
              type="number"
              min={0}
              className={inputClass}
              value={values.licenceCount ?? ""}
              disabled={pending}
              onChange={(e) => setField("licenceCount", e.target.value)}
            />
          </Field>
          <Field label="Install count" error={fieldErrors.installCount}>
            <input
              type="number"
              min={0}
              className={inputClass}
              value={values.installCount ?? ""}
              disabled={pending}
              onChange={(e) => setField("installCount", e.target.value)}
            />
          </Field>
          <Field label="Cost" error={fieldErrors.cost}>
            <input
              type="number"
              min={0}
              step="0.01"
              className={inputClass}
              value={values.cost ?? ""}
              disabled={pending}
              onChange={(e) => setField("cost", e.target.value)}
            />
          </Field>
        </>
      ) : null}

      {category === "people" ? (
        <>
          <Field label="Staff name" error={fieldErrors.name}>
            <input
              className={inputClass}
              value={values.name ?? ""}
              disabled={pending}
              onChange={(e) => setField("name", e.target.value)}
            />
          </Field>
          <Field label="Role" error={fieldErrors.role}>
            <input
              className={inputClass}
              value={values.role ?? ""}
              disabled={pending}
              onChange={(e) => setField("role", e.target.value)}
            />
          </Field>
          <Field label="Skill" error={fieldErrors.skill}>
            <input
              className={inputClass}
              value={values.skill ?? ""}
              disabled={pending}
              onChange={(e) => setField("skill", e.target.value)}
            />
          </Field>
          <Field label="Responsibility" error={fieldErrors.responsibility}>
            <textarea
              className={textareaClass}
              value={values.responsibility ?? ""}
              disabled={pending}
              onChange={(e) => setField("responsibility", e.target.value)}
            />
          </Field>
          {mode === "create" ? (
            <Field label="Business unit id" error={fieldErrors.businessUnitId}>
              <input
                className={inputClass}
                value={values.businessUnitId ?? ""}
                disabled={pending}
                onChange={(e) => setField("businessUnitId", e.target.value)}
              />
            </Field>
          ) : null}
        </>
      ) : null}

      {category === "premise" ? (
        <>
          <Field label="Building name" error={fieldErrors.name}>
            <input
              className={inputClass}
              value={values.name ?? ""}
              disabled={pending}
              onChange={(e) => setField("name", e.target.value)}
            />
          </Field>
          <Field label="Location / postal code" error={fieldErrors.location}>
            <input
              className={inputClass}
              value={values.location ?? ""}
              disabled={pending}
              onChange={(e) => setField("location", e.target.value)}
            />
          </Field>
          <Field label="Address" error={fieldErrors.address}>
            <textarea
              className={textareaClass}
              value={values.address ?? ""}
              disabled={pending}
              onChange={(e) => setField("address", e.target.value)}
            />
          </Field>
          {mode === "create" ? (
            <Field label="Business unit id" error={fieldErrors.businessUnitId}>
              <input
                className={inputClass}
                value={values.businessUnitId ?? ""}
                disabled={pending}
                onChange={(e) => setField("businessUnitId", e.target.value)}
              />
            </Field>
          ) : null}
          <Field label="Cost" error={fieldErrors.cost}>
            <input
              type="number"
              min={0}
              step="0.01"
              className={inputClass}
              value={values.cost ?? ""}
              disabled={pending}
              onChange={(e) => setField("cost", e.target.value)}
            />
          </Field>
        </>
      ) : null}

      {category === "information" ? (
        <>
          <Field label="Title" error={fieldErrors.title}>
            <input
              className={inputClass}
              value={values.title ?? ""}
              disabled={pending}
              onChange={(e) => setField("title", e.target.value)}
            />
          </Field>
          <Field
            label="Information inventory"
            error={fieldErrors.informationInventory}
          >
            <input
              className={inputClass}
              value={values.informationInventory ?? ""}
              disabled={pending}
              onChange={(e) => setField("informationInventory", e.target.value)}
            />
          </Field>
          <Field label="Format" error={fieldErrors.format}>
            <input
              className={inputClass}
              value={values.format ?? ""}
              disabled={pending}
              onChange={(e) => setField("format", e.target.value)}
            />
          </Field>
          <Field label="Storage location" error={fieldErrors.storageLocation}>
            <input
              className={inputClass}
              value={values.storageLocation ?? ""}
              disabled={pending}
              onChange={(e) => setField("storageLocation", e.target.value)}
            />
          </Field>
          <Field label="Link" error={fieldErrors.link}>
            <input
              className={inputClass}
              value={values.link ?? ""}
              disabled={pending}
              onChange={(e) => setField("link", e.target.value)}
            />
          </Field>
          <Field label="Owner id" error={fieldErrors.ownerId}>
            <input
              className={inputClass}
              value={values.ownerId ?? ""}
              disabled={pending}
              onChange={(e) => setField("ownerId", e.target.value)}
            />
          </Field>
          {mode === "create" ? (
            <Field label="Business unit id" error={fieldErrors.businessUnitId}>
              <input
                className={inputClass}
                value={values.businessUnitId ?? ""}
                disabled={pending}
                onChange={(e) => setField("businessUnitId", e.target.value)}
              />
            </Field>
          ) : null}
          <Field label="Cost" error={fieldErrors.cost}>
            <input
              type="number"
              min={0}
              step="0.01"
              className={inputClass}
              value={values.cost ?? ""}
              disabled={pending}
              onChange={(e) => setField("cost", e.target.value)}
            />
          </Field>
        </>
      ) : null}

      <CategorySelectField
        applicableModule={assetCategoryToTagModule(category)}
        value={values.categoryId || undefined}
        disabled={pending}
        error={fieldErrors.categoryId}
        onChange={(next) => setField("categoryId", next ?? "")}
      />

      {!hideActions ? (
        <div className="flex gap-2">
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

export function AssetFormActions({
  formId,
  submitLabel,
  pending = false,
  onCancel,
}: {
  formId: string;
  submitLabel: string;
  pending?: boolean;
  onCancel: () => void;
}) {
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

function toDateInput(value: string | undefined): string {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}
