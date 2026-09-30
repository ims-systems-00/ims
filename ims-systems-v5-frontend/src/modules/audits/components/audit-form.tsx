import { useMemo, useState, type FormEvent } from "react";
import { FormField, FormSection } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/toast";
import { useFunctionalUnitsQuery } from "@/modules/functional-units/hooks/use-functional-units";
import { useUsersQuery } from "@/modules/users/hooks/use-users";
import { createAuditFormSchema, updateAuditFormSchema } from "../schemas";
import type {
  Audit,
  AuditInterval,
  AuditType,
  CreateAuditInput,
  UpdateAuditInput,
} from "../types";
import { AUDIT_INTERVALS } from "../types";

type FieldErrors = Record<string, string>;

type AuditFormProps = {
  mode: "create" | "edit";
  formId: string;
  pending?: boolean;
  hideActions?: boolean;
  /** Fixed type for Internal/External list pages. */
  fixedType: AuditType;
  initialAudit?: Audit;
  onSubmit: (values: CreateAuditInput | UpdateAuditInput) => Promise<void> | void;
  onCancel?: () => void;
  submitLabel: string;
};

function toDateInputValue(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateInputToIso(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  return date.toISOString();
}

export function AuditForm({
  mode,
  formId,
  pending = false,
  hideActions = false,
  fixedType,
  initialAudit,
  onSubmit,
  onCancel,
  submitLabel,
}: AuditFormProps) {
  const [title, setTitle] = useState(initialAudit?.title ?? "");
  const [focusArea, setFocusArea] = useState(initialAudit?.focusArea ?? "");
  const [auditorId, setAuditorId] = useState(initialAudit?.auditorId ?? "");
  const [businessUnitId, setBusinessUnitId] = useState(
    initialAudit?.businessUnitId ?? ""
  );
  const [complianceBodyId, setComplianceBodyId] = useState(
    initialAudit?.complianceBodyId ?? ""
  );
  const [startDate, setStartDate] = useState(
    toDateInputValue(initialAudit?.startDate)
  );
  const [time, setTime] = useState(initialAudit?.time ?? "");
  const [interval, setInterval] = useState<AuditInterval>(
    initialAudit?.interval ?? "Yearly"
  );
  const [comment, setComment] = useState(initialAudit?.comment ?? "");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const usersQuery = useUsersQuery({ page: 1, pageSize: 100 });
  const unitsQuery = useFunctionalUnitsQuery({ page: 1, pageSize: 100 });

  const auditorOptions = useMemo(
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
      const parsed = createAuditFormSchema.safeParse({
        title,
        focusArea,
        auditorId,
        businessUnitId,
        complianceBodyId,
        startDate,
        interval,
        type: fixedType,
        time: time || undefined,
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
          focusArea: parsed.data.focusArea,
          auditorId: parsed.data.auditorId,
          businessUnitId: parsed.data.businessUnitId,
          complianceBodyId: parsed.data.complianceBodyId,
          startDate: dateInputToIso(parsed.data.startDate),
          interval: parsed.data.interval,
          type: parsed.data.type,
          time: parsed.data.time,
        });
      } catch (error) {
        notify.fromError(error, "Unable to schedule audit");
      }
      return;
    }

    const parsed = updateAuditFormSchema.safeParse({
      title,
      focusArea,
      businessUnitId,
      complianceBodyId,
      startDate,
      time: time || undefined,
      comment: comment || undefined,
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
        focusArea: parsed.data.focusArea,
        businessUnitId: parsed.data.businessUnitId,
        complianceBodyId: parsed.data.complianceBodyId,
        startDate: dateInputToIso(parsed.data.startDate),
        time: parsed.data.time ?? null,
        comment: parsed.data.comment ?? null,
      });
    } catch (error) {
      notify.fromError(error, "Unable to update audit");
    }
  }

  return (
    <form
      id={formId}
      className="space-y-6"
      onSubmit={(e) => void handleSubmit(e)}
      noValidate
    >
      <FormSection title="Audit details">
        <FormField label="Title" required error={fieldErrors.title}>
          <input
            className="ims-field"
            value={title}
            disabled={pending}
            onChange={(event) => setTitle(event.target.value)}
          />
        </FormField>
        <FormField label="Focus area" required error={fieldErrors.focusArea}>
          <input
            className="ims-field"
            value={focusArea}
            disabled={pending}
            onChange={(event) => setFocusArea(event.target.value)}
          />
        </FormField>
        <FormField label="Type">
          <input className="ims-field" value={fixedType} disabled readOnly />
        </FormField>
        <FormField
          label="Business unit"
          required
          error={fieldErrors.businessUnitId}
        >
          <select
            className="ims-select"
            value={businessUnitId}
            disabled={pending || unitsQuery.isLoading}
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
        <FormField
          label="Compliance body"
          required
          error={fieldErrors.complianceBodyId}
        >
          <select
            className="ims-select"
            value={complianceBodyId}
            disabled={pending || unitsQuery.isLoading}
            onChange={(event) => setComplianceBodyId(event.target.value)}
          >
            <option value="">Select compliance body</option>
            {unitOptions.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.label}
              </option>
            ))}
          </select>
        </FormField>
      </FormSection>

      <FormSection title="Schedule & ownership">
        <FormField label="Auditor" required error={fieldErrors.auditorId}>
          <select
            className="ims-select"
            value={auditorId}
            disabled={pending || mode === "edit" || usersQuery.isLoading}
            onChange={(event) => setAuditorId(event.target.value)}
          >
            <option value="">Select auditor</option>
            {auditorOptions.map((user) => (
              <option key={user.id} value={user.id}>
                {user.label}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Schedule date" required error={fieldErrors.startDate}>
          <input
            type="date"
            className="ims-field"
            value={startDate}
            disabled={pending}
            onChange={(event) => setStartDate(event.target.value)}
          />
        </FormField>
        <FormField label="Time" error={fieldErrors.time}>
          <input
            className="ims-field"
            placeholder="09:00"
            value={time}
            disabled={pending}
            onChange={(event) => setTime(event.target.value)}
          />
        </FormField>
        <FormField label="Interval" required error={fieldErrors.interval}>
          <select
            className="ims-select"
            value={interval}
            disabled={pending || mode === "edit"}
            onChange={(event) =>
              setInterval(event.target.value as AuditInterval)
            }
          >
            {AUDIT_INTERVALS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {mode === "create" ? (
            <p className="ims-text-meta mt-1.5">
              Quarterly creates 4 audits, Half yearly 2, Yearly 1.
            </p>
          ) : null}
        </FormField>
      </FormSection>

      {mode === "edit" ? (
        <FormSection title="Summary">
          <FormField label="Comment" error={fieldErrors.comment}>
            <textarea
              className="ims-field min-h-[5rem] py-2 leading-relaxed"
              value={comment}
              disabled={pending}
              onChange={(event) => setComment(event.target.value)}
            />
          </FormField>
        </FormSection>
      ) : null}

      {!hideActions ? (
        <AuditFormActions
          formId={formId}
          submitLabel={submitLabel}
          pending={pending}
          onCancel={onCancel}
        />
      ) : null}
    </form>
  );
}

export function AuditFormActions({
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
