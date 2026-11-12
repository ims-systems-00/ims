import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { AppSheet } from "@/shared/components/app-sheet";
import { FormField } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { notify } from "@/shared/lib/toast";
import { isApiClientError } from "@/shared/lib/http/errors";
import { useSessionProfileUserId } from "@/security";
import { createManagementReview } from "@/modules/management-reviews/api/management-reviews";
import { managementReviewKeys } from "@/modules/management-reviews/hooks/use-management-reviews";
import {
  INTERVAL_OCCURRENCES,
  REVIEW_INTERVALS,
  REVIEW_PRIVACY,
  type ReviewInterval,
  type ReviewPrivacy,
} from "@/modules/management-reviews/types";
import { useUsersQuery } from "@/modules/users/hooks/use-users";
import { signalSetupEvent, useSetupGuideStore } from "../store";

function defaultReviewDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().slice(0, 10);
}

function dateInputToIso(value: string): string {
  return new Date(`${value}T00:00:00`).toISOString();
}

/**
 * Alice assist for management review series.
 * Schedules an organisational review series with selected attendees.
 */
export function AliceReviewAssistSheet() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const open = useSetupGuideStore((s) => s.aliceAssistOpen);
  const activeStepId = useSetupGuideStore((s) => s.activeStepId);
  const closeAliceAssist = useSetupGuideStore((s) => s.closeAliceAssist);
  const finishStep = useSetupGuideStore((s) => s.finishStep);
  const closeGuide = useSetupGuideStore((s) => s.closeGuide);
  const showChecklist = useSetupGuideStore((s) => s.showChecklist);
  const selfId = useSessionProfileUserId() ?? "";

  const visible = open && activeStepId === "review";
  const usersQuery = useUsersQuery({ page: 1, pageSize: 100 });
  const users = usersQuery.data?.items ?? [];

  const [title, setTitle] = useState("Annual management review");
  const [privacy, setPrivacy] = useState<ReviewPrivacy>("Organisational");
  const [date, setDate] = useState(defaultReviewDate);
  const [time, setTime] = useState("10:00");
  const [interval, setInterval] = useState<ReviewInterval>("Yearly");
  const [attendees, setAttendees] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setTitle("Annual management review");
    setPrivacy("Organisational");
    setDate(defaultReviewDate());
    setTime("10:00");
    setInterval("Yearly");
    setError(null);
    setCreating(false);
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    if (selfId) {
      setAttendees((current) =>
        current.includes(selfId) ? current : [selfId, ...current]
      );
    }
  }, [visible, selfId]);

  const userOptions = useMemo(
    () =>
      users.map((row) => ({
        id: row.user.id,
        label: `${row.user.name} (${row.user.email})`,
      })),
    [users]
  );

  function toggleAttendee(id: string) {
    setAttendees((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  }

  const ready =
    title.trim().length > 0 &&
    Boolean(date) &&
    attendees.length > 0 &&
    !creating;

  async function handleConfirm() {
    if (!ready) return;
    setCreating(true);
    setError(null);
    try {
      const result = await createManagementReview({
        title: title.trim(),
        date: dateInputToIso(date),
        interval,
        privacy,
        time: time.trim() || undefined,
        attendees,
      });
      const review = result.items[0];
      if (!review) throw new Error("Management review was not created.");
      signalSetupEvent("reviews.scheduled");

      await queryClient.invalidateQueries({
        queryKey: managementReviewKeys.all,
      });

      finishStep("review");
      closeAliceAssist();
      closeGuide();
      showChecklist();
      navigate(
        `/management-reviews?review=${encodeURIComponent(review.id)}`
      );
      notify.success(
        result.items.length > 1
          ? `Alice scheduled ${result.items.length} management reviews`
          : "Alice scheduled the management review"
      );
    } catch (err) {
      setError(
        isApiClientError(err)
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not schedule the management review."
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <AppSheet
      open={visible}
      onOpenChange={(next) => {
        if (!next) closeAliceAssist();
      }}
      title="Alice — schedule management review"
      description="Mandatory fields only. Alice schedules the series with your chosen attendees."
      dataTour="setup.alice.review"
      footer={
        <div className="flex w-full flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={creating}
            onClick={() => closeAliceAssist()}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!ready}
            onClick={() => {
              void handleConfirm();
            }}
          >
            {creating ? (
              <>
                <Loader2 className="animate-spin" aria-hidden />
                Scheduling…
              </>
            ) : (
              "Schedule with Alice"
            )}
          </Button>
        </div>
      }
    >
      {error ? (
        <p className="ims-alert ims-alert-error mb-4" role="alert">
          {error}
        </p>
      ) : null}

      <div className="space-y-4">
        <FormField label="Title" htmlFor="alice-review-title" required>
          <Input
            id="alice-review-title"
            value={title}
            disabled={creating}
            onChange={(event) => setTitle(event.target.value)}
          />
        </FormField>

        <FormField label="Privacy" htmlFor="alice-review-privacy" required>
          <select
            id="alice-review-privacy"
            className="ims-select ims-field"
            value={privacy}
            disabled={creating}
            onChange={(event) =>
              setPrivacy(event.target.value as ReviewPrivacy)
            }
          >
            {REVIEW_PRIVACY.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Date" htmlFor="alice-review-date" required>
            <Input
              id="alice-review-date"
              type="date"
              value={date}
              disabled={creating}
              onChange={(event) => setDate(event.target.value)}
            />
          </FormField>
          <FormField label="Time" htmlFor="alice-review-time">
            <Input
              id="alice-review-time"
              value={time}
              disabled={creating}
              onChange={(event) => setTime(event.target.value)}
              placeholder="10:00"
            />
          </FormField>
        </div>

        <FormField label="Interval" htmlFor="alice-review-interval" required>
          <select
            id="alice-review-interval"
            className="ims-select ims-field"
            value={interval}
            disabled={creating}
            onChange={(event) =>
              setInterval(event.target.value as ReviewInterval)
            }
          >
            {REVIEW_INTERVALS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-[0.75rem] text-muted-foreground">
            Creates {INTERVAL_OCCURRENCES[interval]} review
            {INTERVAL_OCCURRENCES[interval] === 1 ? "" : "s"} across the year.
          </p>
        </FormField>

        <div className="space-y-2" data-tour="setup.alice.review.attendees">
          <p className="ims-text-label">
            Attendees <span className="text-destructive">*</span>
          </p>
          {usersQuery.isLoading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              Loading users…
            </p>
          ) : userOptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No users available to invite yet.
            </p>
          ) : (
            <ul className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border p-2">
              {userOptions.map((user) => {
                const checked = attendees.includes(user.id);
                return (
                  <li key={user.id}>
                    <label className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent/40">
                      <input
                        type="checkbox"
                        className="mt-0.5 size-4 rounded border-border"
                        checked={checked}
                        disabled={creating}
                        onChange={() => toggleAttendee(user.id)}
                      />
                      <span>{user.label}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </AppSheet>
  );
}
