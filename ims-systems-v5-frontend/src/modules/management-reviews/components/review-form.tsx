import { useMemo, useState, type FormEvent } from "react";
import { FormField, FormSection } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/toast";
import { FileDropZone, type FileMetaInfo } from "@/modules/files";
import { useFunctionalUnitsQuery } from "@/modules/functional-units/hooks/use-functional-units";
import { useUsersQuery } from "@/modules/users/hooks/use-users";
import {
  createManagementReviewFormSchema,
  updateManagementReviewFormSchema,
} from "../schemas";
import type {
  AttachmentInput,
  CreateManagementReviewInput,
  ManagementReview,
  ReviewInterval,
  ReviewPrivacy,
  UpdateManagementReviewInput,
} from "../types";
import { INTERVAL_OCCURRENCES, REVIEW_INTERVALS, REVIEW_PRIVACY } from "../types";

type FieldErrors = Record<string, string>;

type ReviewFormProps = {
  mode: "create" | "edit";
  formId: string;
  pending?: boolean;
  hideActions?: boolean;
  initialReview?: ManagementReview;
  onSubmit: (
    values: CreateManagementReviewInput | UpdateManagementReviewInput
  ) => Promise<void> | void;
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

export function ReviewForm({
  mode,
  formId,
  pending = false,
  hideActions = false,
  initialReview,
  onSubmit,
  onCancel,
  submitLabel,
}: ReviewFormProps) {
  const [title, setTitle] = useState(initialReview?.title ?? "");
  const [date, setDate] = useState(toDateInputValue(initialReview?.date));
  const [time, setTime] = useState(initialReview?.time ?? "");
  const [interval, setInterval] = useState<ReviewInterval>(
    initialReview?.interval ?? "Yearly"
  );
  const [privacy, setPrivacy] = useState<ReviewPrivacy>(
    initialReview?.privacy ?? "Organisational"
  );
  const [businessUnitId, setBusinessUnitId] = useState(
    initialReview?.businessUnitId ?? ""
  );
  const [attendees, setAttendees] = useState<string[]>(
    initialReview?.attendees ?? []
  );
  const [agendaFiles, setAgendaFiles] = useState<AttachmentInput[]>([]);
  const [minutesFiles, setMinutesFiles] = useState<AttachmentInput[]>([]);
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

  function toggleAttendee(id: string) {
    setAttendees((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  }

  function toAttachmentInput(meta: FileMetaInfo, file: File): AttachmentInput {
    return {
      fileName: meta.Name,
      mimeType: file.type || undefined,
      sizeBytes: file.size,
      storageKey: meta.Key || meta.key,
      bucket: meta.Bucket,
    };
  }

  function handleAgendaUploaded(meta: FileMetaInfo, file: File) {
    setAgendaFiles((current) => [...current, toAttachmentInput(meta, file)]);
  }

  function handleAgendaRemoved(meta: FileMetaInfo) {
    const key = meta.Key || meta.key;
    setAgendaFiles((current) =>
      current.filter((item) => item.storageKey !== key)
    );
  }

  function handleMinutesUploaded(meta: FileMetaInfo, file: File) {
    setMinutesFiles((current) => [...current, toAttachmentInput(meta, file)]);
  }

  function handleMinutesRemoved(meta: FileMetaInfo) {
    const key = meta.Key || meta.key;
    setMinutesFiles((current) =>
      current.filter((item) => item.storageKey !== key)
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFieldErrors({});

    if (mode === "create") {
      const parsed = createManagementReviewFormSchema.safeParse({
        title,
        date,
        interval,
        privacy,
        businessUnitId: businessUnitId || undefined,
        time: time || undefined,
        attendees,
        agenda: agendaFiles.length > 0 ? agendaFiles : undefined,
        minutes: minutesFiles.length > 0 ? minutesFiles : undefined,
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
          date: dateInputToIso(parsed.data.date),
          interval: parsed.data.interval,
          privacy: parsed.data.privacy,
          businessUnitId: parsed.data.businessUnitId,
          time: parsed.data.time,
          attendees: parsed.data.attendees,
          agenda: parsed.data.agenda,
          minutes: parsed.data.minutes,
        });
      } catch (error) {
        notify.fromError(error, "Unable to schedule management review");
      }
      return;
    }

    const parsed = updateManagementReviewFormSchema.safeParse({
      title,
      date,
      time: time || undefined,
      privacy,
      attendees,
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
        date: dateInputToIso(parsed.data.date),
        time: parsed.data.time ?? null,
        privacy: parsed.data.privacy,
        attendees: parsed.data.attendees,
      });
    } catch (error) {
      notify.fromError(error, "Unable to update management review");
    }
  }

  return (
    <form
      id={formId}
      className="space-y-6"
      onSubmit={(e) => void handleSubmit(e)}
      noValidate
    >
      <FormSection title="Review details">
        <FormField label="Title" required error={fieldErrors.title}>
          <input
            className="ims-field"
            data-tour="reviews.field.title"
            value={title}
            disabled={pending}
            onChange={(event) => setTitle(event.target.value)}
          />
        </FormField>
        <FormField label="Privacy" required error={fieldErrors.privacy}>
          <select
            className="ims-select"
            value={privacy}
            disabled={pending}
            onChange={(event) =>
              setPrivacy(event.target.value as ReviewPrivacy)
            }
          >
            {REVIEW_PRIVACY.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </FormField>
        {privacy === "Business unit" || mode === "create" ? (
          <FormField
            label="Business unit"
            required={privacy === "Business unit"}
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
              disabled={
                pending ||
                unitsQuery.isLoading ||
                mode === "edit" ||
                privacy !== "Business unit"
              }
              onChange={(event) => setBusinessUnitId(event.target.value)}
            >
              <option value="">
                {privacy === "Business unit"
                  ? "Select business unit"
                  : "Not required for organisational reviews"}
              </option>
              {unitOptions.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.label}
                </option>
              ))}
            </select>
          </FormField>
        ) : null}
      </FormSection>

      <FormSection title="Schedule">
        <FormField label="Date" required error={fieldErrors.date}>
          <input
            type="date"
            className="ims-field"
            data-tour="reviews.field.date"
            value={date}
            disabled={pending}
            onChange={(event) => setDate(event.target.value)}
          />
        </FormField>
        <FormField label="Time" error={fieldErrors.time}>
          <input
            className="ims-field"
            placeholder="10:00"
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
              setInterval(event.target.value as ReviewInterval)
            }
          >
            {REVIEW_INTERVALS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {mode === "create" ? (
            <p className="ims-text-meta mt-1.5">
              Creates {INTERVAL_OCCURRENCES[interval]} review
              {INTERVAL_OCCURRENCES[interval] === 1 ? "" : "s"} across the year
              (weekends move to Monday). Agenda and minutes attach to the first
              instance only.
            </p>
          ) : (
            <p className="ims-text-meta mt-1.5">
              Interval is fixed after create.
            </p>
          )}
        </FormField>
      </FormSection>

      <FormSection title="Attendees">
        <FormField
          label="Attendees"
          error={fieldErrors.attendees}
          description={
            usersQuery.isLoading
              ? "Loading users…"
              : userOptions.length === 0
                ? "No users available."
                : undefined
          }
        >
          <ul
            className="max-h-48 space-y-2 overflow-y-auto rounded-sm border border-border-subtle p-2"
            data-tour="reviews.field.attendees"
          >            {userOptions.map((user) => {
              const checked = attendees.includes(user.id);
              return (
                <li key={user.id}>
                  <label className="flex cursor-pointer items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="mt-0.5 size-4 rounded-sm border-border"
                      checked={checked}
                      disabled={pending}
                      onChange={() => toggleAttendee(user.id)}
                    />
                    <span>{user.label}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </FormField>
      </FormSection>

      {mode === "create" ? (
        <FormSection
          title="Documents"
          description="Upload agenda and minutes from your device. Files are stored in the cloud and attach to the first scheduled instance only."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-medium">Agenda</p>
              <FileDropZone
                path="agenda"
                multiple
                disabled={pending}
                onUploaded={handleAgendaUploaded}
                onRemoved={handleAgendaRemoved}
              />
              {fieldErrors.agenda ? (
                <p className="text-sm text-destructive">{fieldErrors.agenda}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Minutes</p>
              <FileDropZone
                path="minutes"
                multiple
                disabled={pending}
                onUploaded={handleMinutesUploaded}
                onRemoved={handleMinutesRemoved}
              />
              {fieldErrors.minutes ? (
                <p className="text-sm text-destructive">{fieldErrors.minutes}</p>
              ) : null}
            </div>
          </div>
        </FormSection>
      ) : null}

      {!hideActions ? (
        <ReviewFormActions
          formId={formId}
          submitLabel={submitLabel}
          pending={pending}
          onCancel={onCancel}
        />
      ) : null}
    </form>
  );
}

export function ReviewFormActions({
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
      <Button
        type="submit"
        form={formId}
        disabled={pending}
        data-tour="reviews.submit"
      >
        {pending ? "Saving…" : submitLabel}
      </Button>
    </div>
  );
}
