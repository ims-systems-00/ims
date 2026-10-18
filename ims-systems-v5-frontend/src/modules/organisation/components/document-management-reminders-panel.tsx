import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/toast";
import { cn } from "@/shared/lib/utils";
import { useUpdateDocumentReviewRemindersMutation } from "../hooks/use-organisations";
import {
  DOCUMENT_REVIEW_REMINDER_OPTIONS,
  type DocumentReviewReminderOffset,
} from "../types";

type DocumentManagementRemindersPanelProps = {
  offsets: DocumentReviewReminderOffset[];
};

/**
 * Organisation settings for advance document review reminders.
 */
export function DocumentManagementRemindersPanel({
  offsets,
}: DocumentManagementRemindersPanelProps) {
  const mutation = useUpdateDocumentReviewRemindersMutation();
  const [selected, setSelected] = useState<DocumentReviewReminderOffset[]>([]);

  useEffect(() => {
    setSelected([...offsets]);
  }, [offsets]);

  function toggle(value: DocumentReviewReminderOffset) {
    setSelected((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    );
  }

  async function handleSave() {
    try {
      await mutation.mutateAsync(selected);
      notify.success("Document management reminders updated");
    } catch (error) {
      notify.fromError(error, "Unable to update reminders");
    }
  }

  return (
    <section className="ims-panel overflow-hidden">
      <div className="ims-panel-header">
        <h3 className="text-sm font-semibold tracking-tight">
          Document Management Reminders
        </h3>
      </div>
      <div className="space-y-4 px-4 py-4">
        <p className="text-[0.8125rem] leading-relaxed text-muted-foreground">
          Choose how far in advance document owners should be reminded before a
          document review date. A reminder is always sent on the exact review
          date. Any options you select below are sent in addition to that.
          Reminder emails and system notifications are sent on the same day as
          each selected reminder.
        </p>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {DOCUMENT_REVIEW_REMINDER_OPTIONS.map((option) => {
            const checked = selected.includes(option.value);
            return (
              <label
                key={option.value}
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2.5 text-sm transition-colors",
                  checked
                    ? "border-primary/40 bg-primary/10 text-foreground"
                    : "border-border-subtle hover:bg-muted/40"
                )}
              >
                <input
                  type="checkbox"
                  className="size-3.5 accent-primary"
                  checked={checked}
                  onChange={() => toggle(option.value)}
                />
                <span className="font-medium">{option.label}</span>
              </label>
            );
          })}
        </div>

        <Button
          type="button"
          size="sm"
          disabled={mutation.isPending}
          onClick={() => void handleSave()}
        >
          {mutation.isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : null}
          Save reminders
        </Button>
      </div>
    </section>
  );
}
