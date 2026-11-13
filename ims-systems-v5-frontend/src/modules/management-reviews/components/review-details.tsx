import { useState, type FormEvent, type ReactNode } from "react";
import { FormField } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/toast";
import {
  AttachmentRow,
  FileDropZone,
  type FileMetaInfo,
} from "@/modules/files";
import { UserDetailsSheet } from "@/modules/users";
import { useUserQuery, useUsersQuery } from "@/modules/users/hooks/use-users";
import { useFunctionalUnitQuery } from "@/modules/functional-units/hooks/use-functional-units";
import {
  useReviewAttachmentMutations,
  useReviewAttendeeMutations,
} from "../hooks/use-management-reviews";
import type {
  AttachmentInput,
  ManagementReview,
  ReviewAttachment,
} from "../types";
import {
  ReviewIntervalBadge,
  ReviewPrivacyBadge,
  ReviewStatusBadge,
} from "./review-badges";
import { ReviewRelatedTasks } from "./review-related-tasks";
import { formatDate, formatDateTime } from "@/shared/lib/format-date";

function Item({ label, value }: { label: string; value: ReactNode }) {
  return (
    <>
      <dt className="ims-detail-label">{label}</dt>
      <dd className="ims-detail-value break-words">{value ?? "—"}</dd>
    </>
  );
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
  /** File Handler path (`agenda` / `minutes`). */
  uploadPath: string;
  files: ReviewAttachment[];
  editable: boolean;
  onUpload?: (files: AttachmentInput[]) => Promise<void>;
  onRemove?: (attachmentId: string) => Promise<void>;
  pending?: boolean;
  removingId?: string | null;
};

function AttachmentList({
  title,
  uploadPath,
  files,
  editable,
  onUpload,
  onRemove,
  pending,
  removingId,
}: AttachmentListProps) {
  async function handleUploaded(meta: FileMetaInfo, file: File) {
    if (!onUpload) return;
    try {
      await onUpload([
        {
          fileName: meta.Name,
          mimeType: file.type || undefined,
          sizeBytes: file.size,
          storageKey: meta.Key || meta.key,
          bucket: meta.Bucket,
        },
      ]);
      notify.success(`${meta.Name} uploaded`);
    } catch (error) {
      notify.fromError(error, `Unable to save ${title.toLowerCase()}`);
    }
  }

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        <p className="mt-0.5 text-[0.75rem] text-muted-foreground">
          Upload documents or images from your device. They are stored in cloud
          storage on this review.
        </p>
      </div>

      {editable && onUpload ? (
        <FileDropZone
          path={uploadPath}
          multiple
          disabled={pending}
          onUploaded={(meta, file) => void handleUploaded(meta, file)}
        />
      ) : null}

      {files.length === 0 ? (
        <p className="ims-text-meta">
          {editable
            ? `No ${title.toLowerCase()} yet — drop files above to add them.`
            : `No ${title.toLowerCase()} attached`}
        </p>
      ) : (
        <div className="space-y-2">
          {files.map((file) =>
            file.storageKey && file.bucket ? (
              <AttachmentRow
                key={file.id}
                file={{
                  Name: file.fileName,
                  Key: file.storageKey,
                  key: file.storageKey,
                  Bucket: file.bucket,
                }}
                sizeBytes={file.sizeBytes}
                metaLine={
                  file.uploadedAt
                    ? `Uploaded ${formatDateTime(file.uploadedAt)}`
                    : undefined
                }
                onDelete={
                  editable && onRemove
                    ? () => void onRemove(file.id)
                    : undefined
                }
              />
            ) : (
              <div
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
              </div>
            )
          )}
        </div>
      )}
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
        uploadPath="agenda"
        files={review.agenda}
        editable={editable}
        pending={pending}
        removingId={removingAttachmentId}
        onUpload={async (files) => {
          await attachments.addAgenda.mutateAsync(files);
        }}
        onRemove={handleRemoveAgenda}
      />

      <AttachmentList
        title="Minutes"
        uploadPath="minutes"
        files={review.minutes}
        editable={editable}
        pending={pending}
        removingId={removingAttachmentId}
        onUpload={async (files) => {
          await attachments.addMinutes.mutateAsync(files);
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
