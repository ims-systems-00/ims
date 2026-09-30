import { useState, type FormEvent } from "react";
import { FormField, FormSection } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/toast";
import {
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from "../lib/date-utils";
import {
  createCalendarEventFormSchema,
  updateCalendarEventFormSchema,
} from "../schemas";
import type {
  CalendarEvent,
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
} from "../types";

type FieldErrors = Record<string, string>;

type CalendarEventFormProps = {
  mode: "create" | "edit";
  formId: string;
  pending?: boolean;
  hideActions?: boolean;
  initialEvent?: CalendarEvent;
  /** Prefill for slot-based create. */
  defaultStart?: string;
  defaultEnd?: string;
  onSubmit: (
    values: CreateCalendarEventInput | UpdateCalendarEventInput
  ) => Promise<void> | void;
  onCancel?: () => void;
  submitLabel: string;
};

export function CalendarEventForm({
  mode,
  formId,
  pending = false,
  hideActions = false,
  initialEvent,
  defaultStart,
  defaultEnd,
  onSubmit,
  onCancel,
  submitLabel,
}: CalendarEventFormProps) {
  const [title, setTitle] = useState(initialEvent?.title ?? "");
  const [start, setStart] = useState(
    toDatetimeLocalValue(
      initialEvent?.start ?? defaultStart ?? new Date().toISOString()
    )
  );
  const [end, setEnd] = useState(
    toDatetimeLocalValue(
      initialEvent?.end ?? defaultEnd ?? new Date().toISOString()
    )
  );
  const [description, setDescription] = useState(
    initialEvent?.description ?? ""
  );
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFieldErrors({});

    let startIso: string;
    let endIso: string;
    try {
      startIso = fromDatetimeLocalValue(start);
      endIso = fromDatetimeLocalValue(end);
    } catch {
      setFieldErrors({ start: "Valid date/time is required" });
      return;
    }

    const raw = {
      title,
      start: new Date(startIso),
      end: new Date(endIso),
      description: description.trim() || undefined,
    };

    const schema =
      mode === "create"
        ? createCalendarEventFormSchema
        : updateCalendarEventFormSchema;
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      const errors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!errors[key]) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    try {
      if (mode === "create") {
        await onSubmit({
          title: title.trim(),
          start: startIso,
          end: endIso,
          description: description.trim() || undefined,
        });
      } else {
        await onSubmit({
          title: title.trim(),
          start: startIso,
          end: endIso,
          description: description.trim(),
        });
      }
    } catch (error) {
      notify.fromError(error, "Unable to save calendar event");
    }
  }

  return (
    <form id={formId} className="space-y-6" onSubmit={handleSubmit} noValidate>
      <FormSection title="Event">
        <FormField label="Title" htmlFor="cal-title" error={fieldErrors.title} required>
          <input
            id="cal-title"
            className="ims-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={pending}
            aria-invalid={Boolean(fieldErrors.title)}
            autoComplete="off"
          />
        </FormField>
        <FormField label="Start" htmlFor="cal-start" error={fieldErrors.start} required>
          <input
            id="cal-start"
            type="datetime-local"
            className="ims-input"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            disabled={pending}
            aria-invalid={Boolean(fieldErrors.start)}
          />
        </FormField>
        <FormField label="End" htmlFor="cal-end" error={fieldErrors.end} required>
          <input
            id="cal-end"
            type="datetime-local"
            className="ims-input"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            disabled={pending}
            aria-invalid={Boolean(fieldErrors.end)}
          />
        </FormField>
        <FormField label="Description" htmlFor="cal-description" error={fieldErrors.description}>
          <textarea
            id="cal-description"
            className="ims-input min-h-24"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={pending}
            rows={4}
          />
        </FormField>
      </FormSection>

      {!hideActions ? (
        <CalendarEventFormActions
          formId={formId}
          submitLabel={submitLabel}
          pending={pending}
          onCancel={onCancel}
        />
      ) : null}
    </form>
  );
}

export function CalendarEventFormActions({
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
    <div className="flex flex-wrap items-center justify-end gap-2">
      {onCancel ? (
        <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
      ) : null}
      <Button type="submit" form={formId} disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </Button>
    </div>
  );
}
