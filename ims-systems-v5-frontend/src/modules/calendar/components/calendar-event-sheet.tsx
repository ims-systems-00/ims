import { useState } from "react";
import { AppSheet } from "@/shared/components/app-sheet";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { Button } from "@/shared/components/ui/button";
import { isApiClientError } from "@/shared/lib/http/errors";
import { notify } from "@/shared/lib/toast";
import {
  useCalendarEventQuery,
  useCreateCalendarEventMutation,
  useDeleteCalendarEventMutation,
  useUpdateCalendarEventMutation,
} from "../hooks/use-calendar";
import { isLinkedEvent, type CreateCalendarEventInput, type UpdateCalendarEventInput } from "../types";
import {
  CalendarEventDetails,
  CalendarEventDetailsLoading,
} from "./calendar-event-details";
import {
  CalendarEventForm,
  CalendarEventFormActions,
} from "./calendar-event-form";

export type CalendarEventSheetMode = "create" | "view" | "edit";

type CalendarEventSheetProps = {
  open: boolean;
  mode: CalendarEventSheetMode;
  eventId?: string | null;
  defaultStart?: string;
  defaultEnd?: string;
  onOpenChange: (open: boolean) => void;
  onModeChange: (mode: CalendarEventSheetMode) => void;
  onCreated?: () => void;
  onDeleted?: () => void;
};

export function CalendarEventSheet({
  open,
  mode,
  eventId,
  defaultStart,
  defaultEnd,
  onOpenChange,
  onModeChange,
  onCreated,
  onDeleted,
}: CalendarEventSheetProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);

  const eventQuery = useCalendarEventQuery(
    mode === "create" ? undefined : (eventId ?? undefined)
  );
  const createMutation = useCreateCalendarEventMutation();
  const updateMutation = useUpdateCalendarEventMutation(eventId ?? "");
  const deleteMutation = useDeleteCalendarEventMutation();

  const event = eventQuery.data;
  const linked = event ? isLinkedEvent(event) : false;
  const pending =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  async function handleCreate(
    values: CreateCalendarEventInput | UpdateCalendarEventInput
  ) {
    await createMutation.mutateAsync(values as CreateCalendarEventInput);
    notify.success("Event created");
    onCreated?.();
    onOpenChange(false);
  }

  async function handleUpdate(
    values: CreateCalendarEventInput | UpdateCalendarEventInput
  ) {
    await updateMutation.mutateAsync(values as UpdateCalendarEventInput);
    notify.success("Event updated");
    onModeChange("view");
  }

  async function confirmDelete() {
    if (!eventId) return;
    try {
      await deleteMutation.mutateAsync(eventId);
      setDeleteOpen(false);
      onDeleted?.();
      onOpenChange(false);
      notify.success("Event deleted");
    } catch (error) {
      notify.fromError(error, "Unable to delete event");
    }
  }

  const title =
    mode === "create"
      ? "Create event"
      : mode === "edit"
        ? "Edit event"
        : event
          ? event.title
          : "Event";

  const description =
    mode === "create"
      ? "Add a standalone calendar entry for this organisation."
      : mode === "edit"
        ? "Update title, times, or description."
        : linked
          ? "Linked module event — view only in Calendar."
          : "Standalone calendar event.";

  const formId = mode === "create" ? "calendar-create" : "calendar-edit";

  return (
    <>
      <AppSheet
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        description={description}
        footer={
          mode === "create" ? (
            <CalendarEventFormActions
              formId={formId}
              submitLabel="Create event"
              pending={pending}
              onCancel={() => onOpenChange(false)}
            />
          ) : mode === "edit" ? (
            <CalendarEventFormActions
              formId={formId}
              submitLabel="Save changes"
              pending={pending}
              onCancel={() => onModeChange("view")}
            />
          ) : (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
              {!linked ? (
                <>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setDeleteOpen(true)}
                    disabled={pending}
                  >
                    Delete
                  </Button>
                  <Button
                    type="button"
                    onClick={() => onModeChange("edit")}
                    disabled={!event || pending}
                  >
                    Edit
                  </Button>
                </>
              ) : null}
            </div>
          )
        }
      >
        {mode === "create" ? (
          <CalendarEventForm
            mode="create"
            formId={formId}
            pending={pending}
            hideActions
            defaultStart={defaultStart}
            defaultEnd={defaultEnd}
            onSubmit={handleCreate}
            submitLabel="Create event"
          />
        ) : mode === "edit" && event && !linked ? (
          <CalendarEventForm
            key={event.id}
            mode="edit"
            formId={formId}
            pending={pending}
            hideActions
            initialEvent={event}
            onSubmit={handleUpdate}
            submitLabel="Save changes"
          />
        ) : eventQuery.isLoading ? (
          <CalendarEventDetailsLoading />
        ) : eventQuery.isError ? (
          <p className="ims-alert ims-alert-error" role="alert">
            {isApiClientError(eventQuery.error) &&
            (eventQuery.error.status === 403 ||
              eventQuery.error.code === "FORBIDDEN")
              ? "You do not have permission to view this event."
              : "Unable to load event details."}
          </p>
        ) : event ? (
          <CalendarEventDetails event={event} />
        ) : (
          <p className="text-sm text-muted-foreground">Event not found.</p>
        )}
      </AppSheet>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete event?"
        description="This removes the standalone calendar event from the organisation calendar."
        confirmLabel="Delete"
        pending={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </>
  );
}

/** Alias for cross-module reuse of the Calendar details experience. */
export const CalendarEventDetailsSheet = CalendarEventSheet;
