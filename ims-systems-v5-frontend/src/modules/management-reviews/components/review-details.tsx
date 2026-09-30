import { useState, type FormEvent, type ReactNode } from "react";
import { FormField } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/toast";
import { UserDetailsSheet } from "@/modules/users";
import { useUserQuery, useUsersQuery } from "@/modules/users/hooks/use-users";
import { useFunctionalUnitQuery } from "@/modules/functional-units/hooks/use-functional-units";
import {
  useReviewAttachmentMutations,
  useReviewAttendeeMutations,
} from "../hooks/use-management-reviews";
import { attachmentFormSchema } from "../schemas";
import type { ManagementReview, ReviewAttachment } from "../types";
import {
  ReviewIntervalBadge,
  ReviewPrivacyBadge,
  ReviewStatusBadge,
} from "./review-badges";
import { ReviewRelatedTasks } from "./review-related-tasks";

function Item({ label, value }: { label: string; value: ReactNode }) {
  return (
    <>
      <dt className="ims-detail-label">{label}</dt>
      <dd className="ims-detail-value break-words">{value ?? "—"}</dd>
    </>
  );
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function UserLabel({
  userId,
  onOpen,
}: {
  userId?: string | null;
  onOpen: (id: string) => void;
}) {
  const query = useUserQuery(userId ?? undefined, Boolean(userId));
  if (!userId) return <>—</>;
  const name = query.data?.user.name ?? userId;
  const canOpen = /^[a-fA-F0-9]{24}$/.test(userId);
  if (!canOpen) return <span>{name}</span>;
  return (
    <button
      type="button"
      className="text-left font-medium text-foreground underline-offset-2 hover:underline"
      onClick={() => onOpen(userId)}
    >
      {name}
    </button>
  );
}

function UnitLabel({ id }: { id?: string }) {
  const query = useFunctionalUnitQuery(id);
  if (!id) return <>—</>;
  return <>{query.data?.name ?? id}</>;
}

type AttachmentListProps = {
  title: string;
  files: ReviewAttachment[];
  editable: boolean;
  onAdd?: (fileName: string, url?: string) => Promise<void>;
  onRemove?: (attachmentId: string) => Promise<void>;
  pending?: boolean;
  removingId?: string | null;
};

function AttachmentList({
  title,
  files,
  editable,
  onAdd,
  onRemove,
  pending,
  removingId,
}: AttachmentListProps) {
  const [fileName, setFileName] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | undefined>();

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    if (!onAdd) return;
    const parsed = attachmentFormSchema.safeParse({
      fileName,
      url: url || undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid attachment");
      return;
    }
    setError(undefined);
    try {
      await onAdd(parsed.data.fileName, parsed.data.url || undefined);
      setFileName("");
      setUrl("");
    } catch (err) {
      notify.fromError(err, `Unable to add ${title.toLowerCase()}`);
    }
  }

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
      {files.length === 0 ? (
        <p className="ims-text-meta">No {title.toLowerCase()} attached</p>
      ) : (
        <ul className="space-y-2">
          {files.map((file) => (
            <li
              key={file.id}
              className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
            >
              <span className="min-w-0 truncate">
                {file.url ? (
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    className="underline-offset-2 hover:underline"
                  >
                    {file.fileName}
                  </a>
                ) : (
                  file.fileName
                )}
              </span>
              {editable && onRemove ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={pending || removingId === file.id}
                  onClick={() => void onRemove(file.id)}
                >
                  Remove
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {editable && onAdd ? (
        <form
          className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
          onSubmit={(e) => void handleAdd(e)}
        >
          <FormField label="File name" required error={error}>
            <input
              className="ims-field"
              value={fileName}
              disabled={pending}
              placeholder="document.pdf"
              onChange={(event) => setFileName(event.target.value)}
            />
          </FormField>
          <FormField label="URL (optional)">
            <input
              className="ims-field"
              value={url}
              disabled={pending}
              placeholder="https://"
              onChange={(event) => setUrl(event.target.value)}
            />
          </FormField>
          <div className="flex items-end">
            <Button type="submit" size="sm" disabled={pending}>
              Add
            </Button>
          </div>
        </form>
      ) : null}
    </section>
  );
}

type ReviewDetailsProps = {
  review: ManagementReview;
};

export function ReviewDetails({ review }: ReviewDetailsProps) {
  const [userSheetId, setUserSheetId] = useState<string | null>(null);
  const [removingAttachmentId, setRemovingAttachmentId] = useState<
    string | null
  >(null);
  const [attendeeToAdd, setAttendeeToAdd] = useState("");

  const completed = review.completed.status;
  const editable = !completed;
  const attachments = useReviewAttachmentMutations(review.id);
  const attendees = useReviewAttendeeMutations(review.id);
  const usersQuery = useUsersQuery({ page: 1, pageSize: 100 });

  const pending =
    attachments.addAgenda.isPending ||
    attachments.removeAgenda.isPending ||
    attachments.addMinutes.isPending ||
    attachments.removeMinutes.isPending ||
    attendees.add.isPending ||
    attendees.remove.isPending;

  async function handleRemoveAgenda(id: string) {
    setRemovingAttachmentId(id);
    try {
      await attachments.removeAgenda.mutateAsync(id);
      notify.success("Agenda attachment removed");
    } catch (error) {
      notify.fromError(error, "Unable to remove agenda attachment");
    } finally {
      setRemovingAttachmentId(null);
    }
  }

  async function handleRemoveMinutes(id: string) {
    setRemovingAttachmentId(id);
    try {
      await attachments.removeMinutes.mutateAsync(id);
      notify.success("Minutes attachment removed");
    } catch (error) {
      notify.fromError(error, "Unable to remove minutes attachment");
    } finally {
      setRemovingAttachmentId(null);
    }
  }

  async function handleAddAttendee(event: FormEvent) {
    event.preventDefault();
    if (!attendeeToAdd) return;
    try {
      await attendees.add.mutateAsync(attendeeToAdd);
      setAttendeeToAdd("");
      notify.success("Attendee added");
    } catch (error) {
      notify.fromError(error, "Unable to add attendee");
    }
  }

  const availableUsers = (usersQuery.data?.items ?? []).filter(
    (row) => !review.attendees.includes(row.user.id)
  );

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-3 text-sm font-semibold tracking-tight">Overview</h3>
        <dl className="ims-detail-grid">
          <Item label="Reference" value={review.reference} />
          <Item
            label="Status"
            value={<ReviewStatusBadge status={review.displayStatus} />}
          />
          <Item
            label="Privacy"
            value={<ReviewPrivacyBadge privacy={review.privacy} />}
          />
          <Item
            label="Interval"
            value={<ReviewIntervalBadge interval={review.interval} />}
          />
          <Item label="Schedule date" value={formatDate(review.date)} />
          <Item label="Time" value={review.time || "—"} />
        </dl>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold tracking-tight">
          People & organisation
        </h3>
        <dl className="ims-detail-grid">
          <Item
            label="Business unit"
            value={<UnitLabel id={review.businessUnitId} />}
          />
          <Item
            label="Created by"
            value={
              <UserLabel userId={review.createdBy} onOpen={setUserSheetId} />
            }
          />
          <Item label="Created" value={formatDateTime(review.createdOn)} />
        </dl>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold tracking-tight">Attendees</h3>
        {review.attendees.length === 0 ? (
          <p className="ims-text-meta">No attendees</p>
        ) : (
          <ul className="space-y-2">
            {review.attendees.map((id) => (
              <li
                key={id}
                className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
              >
                <UserLabel userId={id} onOpen={setUserSheetId} />
                {editable ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => {
                      void attendees.remove
                        .mutateAsync(id)
                        .then(() => notify.success("Attendee removed"))
                        .catch((error) =>
                          notify.fromError(error, "Unable to remove attendee")
                        );
                    }}
                  >
                    Remove
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {editable ? (
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(e) => void handleAddAttendee(e)}
          >
            <FormField label="Add attendee" className="min-w-[14rem] flex-1">
              <select
                className="ims-select"
                value={attendeeToAdd}
                disabled={pending || usersQuery.isLoading}
                onChange={(event) => setAttendeeToAdd(event.target.value)}
              >
                <option value="">Select user</option>
                {availableUsers.map((row) => (
                  <option key={row.user.id} value={row.user.id}>
                    {row.user.name}
                  </option>
                ))}
              </select>
            </FormField>
            <Button
              type="submit"
              size="sm"
              disabled={pending || !attendeeToAdd}
            >
              Add
            </Button>
          </form>
        ) : null}
      </section>

      <AttachmentList
        title="Agenda"
        files={review.agenda}
        editable={editable}
        pending={pending}
        removingId={removingAttachmentId}
        onAdd={async (fileName, url) => {
          await attachments.addAgenda.mutateAsync([{ fileName, url }]);
          notify.success("Agenda attachment added");
        }}
        onRemove={handleRemoveAgenda}
      />

      <AttachmentList
        title="Minutes"
        files={review.minutes}
        editable={editable}
        pending={pending}
        removingId={removingAttachmentId}
        onAdd={async (fileName, url) => {
          await attachments.addMinutes.mutateAsync([{ fileName, url }]);
          notify.success("Minutes attachment added");
        }}
        onRemove={handleRemoveMinutes}
      />

      <ReviewRelatedTasks
        reviewId={review.id}
        businessUnitId={review.businessUnitId}
      />

      {completed ? (
        <section>
          <h3 className="mb-3 text-sm font-semibold tracking-tight">
            Completion
          </h3>
          <dl className="ims-detail-grid">
            <Item
              label="Completed by"
              value={
                <UserLabel
                  userId={review.completed.by}
                  onOpen={setUserSheetId}
                />
              }
            />
            <Item
              label="Completed on"
              value={formatDateTime(review.completed.on)}
            />
          </dl>
        </section>
      ) : null}

      <UserDetailsSheet
        open={Boolean(userSheetId)}
        userId={userSheetId}
        onOpenChange={(open) => {
          if (!open) setUserSheetId(null);
        }}
      />
    </div>
  );
}

export function ReviewDetailsLoading() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
      <div className="h-20 animate-pulse rounded bg-muted" />
      <div className="h-20 animate-pulse rounded bg-muted" />
    </div>
  );
}
