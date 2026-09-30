import { useMemo, useState, type FormEvent } from "react";
import { FormField, FormSection } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/toast";
import { useFunctionalUnitsQuery } from "@/modules/functional-units/hooks/use-functional-units";
import { useUsersQuery } from "@/modules/users/hooks/use-users";
import {
  createIncidentFormSchema,
  updateIncidentFormSchema,
} from "../schemas";
import type {
  CreateIncidentInput,
  Incident,
  IncidentPriority,
  IncidentPrivacy,
  UpdateIncidentInput,
} from "../types";
import { INCIDENT_PRIORITIES, INCIDENT_PRIVACY } from "../types";

type FieldErrors = Record<string, string>;

type IncidentFormProps = {
  mode: "create" | "edit";
  formId: string;
  pending?: boolean;
  hideActions?: boolean;
  initialIncident?: Incident;
  lockedFromSource?: boolean;
  onSubmit: (
    values: CreateIncidentInput | UpdateIncidentInput
  ) => Promise<void> | void;
  onCancel?: () => void;
  submitLabel: string;
};

export function IncidentForm({
  mode,
  formId,
  pending = false,
  hideActions = false,
  initialIncident,
  lockedFromSource = false,
  onSubmit,
  onCancel,
  submitLabel,
}: IncidentFormProps) {
  const [title, setTitle] = useState(initialIncident?.title ?? "");
  const [description, setDescription] = useState(
    initialIncident?.description ?? ""
  );
  const [businessUnitId, setBusinessUnitId] = useState(
    initialIncident?.businessUnitId ?? ""
  );
  const [priority, setPriority] = useState<IncidentPriority>(
    initialIncident?.priority ?? "P1"
  );
  const [ownerId, setOwnerId] = useState(initialIncident?.ownerId ?? "");
  const [methodOfNotification, setMethodOfNotification] = useState(
    initialIncident?.methodOfNotification ?? ""
  );
  const [affectedService, setAffectedService] = useState(
    initialIncident?.affectedService ?? ""
  );
  const [privacy, setPrivacy] = useState<IncidentPrivacy>(
    initialIncident?.privacy ?? "Business unit"
  );
  const [resolution, setResolution] = useState(
    initialIncident?.resolution ?? ""
  );
  const [resolved, setResolved] = useState(
    Boolean(initialIncident?.resolved.status)
  );
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const usersQuery = useUsersQuery({ page: 1, pageSize: 100 });
  const unitsQuery = useFunctionalUnitsQuery({ page: 1, pageSize: 100 });

  const ownerOptions = useMemo(
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
      const parsed = createIncidentFormSchema.safeParse({
        title,
        description,
        businessUnitId,
        priority,
        ownerId,
        methodOfNotification: methodOfNotification || undefined,
        affectedService: affectedService || undefined,
        privacy,
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
          description: parsed.data.description,
          businessUnitId: parsed.data.businessUnitId,
          priority: parsed.data.priority,
          ownerId: parsed.data.ownerId,
          methodOfNotification: parsed.data.methodOfNotification,
          affectedService: parsed.data.affectedService,
          privacy: parsed.data.privacy,
        });
      } catch (error) {
        notify.fromError(error, "Unable to raise incident");
      }
      return;
    }

    const parsed = updateIncidentFormSchema.safeParse({
      title,
      description,
      ownerId,
      priority,
      methodOfNotification: methodOfNotification || undefined,
      affectedService: affectedService || undefined,
      privacy,
      resolution: resolution || undefined,
      resolved,
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
        description: parsed.data.description,
        ownerId: parsed.data.ownerId,
        priority: parsed.data.priority,
        methodOfNotification: parsed.data.methodOfNotification ?? null,
        affectedService: parsed.data.affectedService ?? null,
        privacy: parsed.data.privacy,
        resolution: parsed.data.resolution ?? null,
        resolved: parsed.data.resolved,
      });
    } catch (error) {
      notify.fromError(error, "Unable to update incident");
    }
  }

  const titleLocked = lockedFromSource;

  return (
    <form
      id={formId}
      className="space-y-6"
      onSubmit={(e) => void handleSubmit(e)}
      noValidate
    >
      <FormSection title="Incident details">
        <FormField label="Title" required error={fieldErrors.title}>
          <input
            className="ims-field"
            value={title}
            disabled={pending || titleLocked}
            onChange={(event) => setTitle(event.target.value)}
          />
        </FormField>
        <FormField
          label="Description"
          required
          error={fieldErrors.description}
        >
          <textarea
            className="ims-field min-h-[5.5rem] py-2 leading-relaxed"
            value={description}
            disabled={pending}
            onChange={(event) => setDescription(event.target.value)}
          />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Priority" required error={fieldErrors.priority}>
            <select
              className="ims-select"
              value={priority}
              disabled={pending}
              onChange={(event) =>
                setPriority(event.target.value as IncidentPriority)
              }
            >
              {INCIDENT_PRIORITIES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Privacy" error={fieldErrors.privacy}>
            <select
              className="ims-select"
              value={privacy}
              disabled={pending}
              onChange={(event) =>
                setPrivacy(event.target.value as IncidentPrivacy)
              }
            >
              {INCIDENT_PRIVACY.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </FormField>
        </div>
        <FormField
          label="Method of notification"
          error={fieldErrors.methodOfNotification}
        >
          <input
            className="ims-field"
            value={methodOfNotification}
            disabled={pending}
            onChange={(event) => setMethodOfNotification(event.target.value)}
          />
        </FormField>
        <FormField
          label="Affected service"
          error={fieldErrors.affectedService}
        >
          <input
            className="ims-field"
            value={affectedService}
            disabled={pending}
            onChange={(event) => setAffectedService(event.target.value)}
          />
        </FormField>
      </FormSection>

      <FormSection title="Ownership">
        <FormField
          label="Incident owner"
          required={mode === "create"}
          error={fieldErrors.ownerId}
        >
          <select
            className="ims-select"
            value={ownerId}
            disabled={pending}
            onChange={(event) => setOwnerId(event.target.value)}
          >
            <option value="">Select owner</option>
            {ownerOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </FormField>
        {mode === "create" ? (
          <FormField
            label="Business unit"
            required
            description="Cannot be changed after the incident is raised."
            error={fieldErrors.businessUnitId}
          >
            <select
              className="ims-select"
              value={businessUnitId}
              disabled={pending || unitsQuery.isLoading}
              onChange={(event) => setBusinessUnitId(event.target.value)}
            >
              <option value="">Select a unit</option>
              {unitOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </FormField>
        ) : initialIncident?.businessUnitId ? (
          <p className="ims-text-meta">Business unit is fixed after create.</p>
        ) : null}
      </FormSection>

      {mode === "edit" ? (
        <FormSection title="Resolution">
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={resolved}
              disabled={pending || Boolean(initialIncident?.resolved.status)}
              onChange={(event) => setResolved(event.target.checked)}
            />
            <span>
              Mark as resolved
              <span className="mt-0.5 block ims-text-meta">
                Resolved incidents cannot be edited further.
              </span>
            </span>
          </label>
          <FormField
            label="Resolution"
            required={resolved}
            error={fieldErrors.resolution}
          >
            <textarea
              className="ims-field min-h-[4.5rem] py-2 leading-relaxed"
              value={resolution}
              disabled={pending || Boolean(initialIncident?.resolved.status)}
              onChange={(event) => setResolution(event.target.value)}
            />
          </FormField>
        </FormSection>
      ) : null}

      {!hideActions ? (
        <div className="flex justify-end gap-2">
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
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : submitLabel}
          </Button>
        </div>
      ) : null}
    </form>
  );
}

export function IncidentFormActions({
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
    <>
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
    </>
  );
}
