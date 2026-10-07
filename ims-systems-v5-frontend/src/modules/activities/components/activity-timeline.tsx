import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Loader2, MessageSquare, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { EmptyState } from "@/shared/components/empty-state";
import { Textarea } from "@/shared/components/ui/textarea";
import { isApiClientError } from "@/shared/lib/http/errors";
import { notify } from "@/shared/lib/toast";
import { DEV_STUB_IDENTITY } from "@/security";
import { useUserQuery } from "@/modules/users/hooks/use-users";
import {
  useActivitiesQuery,
  useCreateActivityMutation,
  useDeleteActivityMutation,
  useUpdateActivityMutation,
} from "../hooks/use-activities";
import { createActivityFormSchema } from "../schemas";
import type { Activity, ActivityModuleType } from "../types";

type ActivityTimelineProps = {
  moduleType: ActivityModuleType;
  moduleId: string;
  /** Hide composer and edit/delete (parent record closed). */
  readOnly?: boolean;
  /** Tab / section title context. */
  title?: string;
  addLabel?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  subjectId?: string;
  className?: string;
};

function formatRelative(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 14) return `${days}d ago`;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(value: string): string {
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

function AuthorLabel({ userId }: { userId: string }) {
  const query = useUserQuery(userId, /^[a-fA-F0-9]{24}$/.test(userId));
  if (!/^[a-fA-F0-9]{24}$/.test(userId)) {
    return <span className="font-medium">{userId}</span>;
  }
  return (
    <span className="font-medium">
      {query.data?.user.name ?? userId.slice(0, 8)}
    </span>
  );
}

function ManualEntry({
  activity,
  canManage,
  pending,
  onEdit,
  onDelete,
}: {
  activity: Activity;
  canManage: boolean;
  pending: boolean;
  onEdit: (activity: Activity) => void;
  onDelete: (activity: Activity) => void;
}) {
  return (
    <article className="rounded-md border border-border-subtle bg-surface-muted/30 p-3">
      <header className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <AuthorLabel userId={activity.createdBy} />
        <time
          className="ims-text-meta"
          dateTime={activity.createdOn}
          title={formatDateTime(activity.createdOn)}
        >
          {formatRelative(activity.createdOn)}
        </time>
      </header>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
        {activity.value}
      </p>
      {canManage ? (
        <footer className="mt-3 flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => onEdit(activity)}
          >
            <Pencil className="size-3.5" aria-hidden />
            Edit
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            disabled={pending}
            onClick={() => onDelete(activity)}
          >
            <Trash2 className="size-3.5" aria-hidden />
            Delete
          </Button>
        </footer>
      ) : null}
    </article>
  );
}

function AutomatedEntry({ activity }: { activity: Activity }) {
  return (
    <article className="rounded-md border border-dashed border-border-subtle p-3">
      <header className="mb-1 flex flex-wrap items-start gap-2">
        {activity.iconSrc ? (
          <img
            src={activity.iconSrc}
            alt=""
            className="mt-0.5 size-5 rounded-full object-cover"
          />
        ) : (
          <span
            className="mt-0.5 inline-flex size-5 items-center justify-center rounded-full bg-muted text-[0.65rem] font-semibold text-muted-foreground"
            aria-hidden
          >
            iMS
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug text-foreground">
            {activity.value}
          </p>
          <time className="ims-text-meta" dateTime={activity.createdOn}>
            {formatDateTime(activity.createdOn)}
          </time>
        </div>
      </header>
      {activity.extraLogs.length > 0 ? (
        <ul className="mt-2 space-y-2 border-t border-border-subtle pt-2">
          {activity.extraLogs.map((log, index) => (
            <li
              key={`${activity.id}-log-${index}`}
              className="rounded bg-surface-muted/50 px-2.5 py-2"
            >
              <p className="text-xs font-medium text-foreground">{log.title}</p>
              {log.description ? (
                <p className="mt-0.5 text-xs text-muted-foreground whitespace-pre-wrap">
                  {log.description}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

/**
 * Embedded activity / interactions / comments timeline for parent record sheets.
 */
export function ActivityTimeline({
  moduleType,
  moduleId,
  readOnly = false,
  title = "Activity",
  addLabel = "Add comment",
  emptyTitle = "No activities found",
  emptyDescription = "Comments and system events for this record will appear here.",
  subjectId = DEV_STUB_IDENTITY.subjectId,
  className,
}: ActivityTimelineProps) {
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Activity[]>([]);
  const [draft, setDraft] = useState("");
  const [formError, setFormError] = useState<string | undefined>();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const listParams = useMemo(
    () => ({
      page,
      pageSize: 10,
      moduleType,
      moduleId,
      sort: "createdOn" as const,
      sortDir: "desc" as const,
    }),
    [page, moduleType, moduleId]
  );

  const listQuery = useActivitiesQuery(listParams, Boolean(moduleId));
  const createMutation = useCreateActivityMutation();
  const updateMutation = useUpdateActivityMutation();
  const deleteMutation = useDeleteActivityMutation();

  const pending =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  useEffect(() => {
    setPage(1);
    setItems([]);
    setEditingId(null);
    setDraft("");
  }, [moduleType, moduleId]);

  useEffect(() => {
    if (!listQuery.data) return;
    setItems((current) => {
      if (listQuery.data.page === 1) return listQuery.data.items;
      const seen = new Set(current.map((row) => row.id));
      const appended = listQuery.data.items.filter((row) => !seen.has(row.id));
      return [...current, ...appended];
    });
  }, [listQuery.data]);

  const hasMore =
    listQuery.data != null && listQuery.data.page < listQuery.data.totalPages;

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    const parsed = createActivityFormSchema.safeParse({ value: draft });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Invalid comment");
      return;
    }
    setFormError(undefined);
    try {
      await createMutation.mutateAsync({
        moduleType,
        moduleId,
        value: parsed.data.value,
      });
      notify.success("Comment added successfully");
      setDraft("");
      setPage(1);
    } catch (error) {
      notify.fromError(error, "Failed to add comment");
    }
  }

  async function handleUpdate(event: FormEvent) {
    event.preventDefault();
    if (!editingId) return;
    const parsed = createActivityFormSchema.safeParse({ value: editDraft });
    if (!parsed.success) {
      notify.error(parsed.error.issues[0]?.message ?? "Invalid comment");
      return;
    }
    try {
      await updateMutation.mutateAsync({
        id: editingId,
        body: { value: parsed.data.value },
      });
      notify.success("Comment updated successfully");
      setEditingId(null);
      setEditDraft("");
      setPage(1);
    } catch (error) {
      notify.fromError(error, "Failed to update comment");
    }
  }

  async function handleDelete(activity: Activity) {
    try {
      await deleteMutation.mutateAsync(activity.id);
      notify.success("Comment deleted successfully");
      setItems((current) => current.filter((row) => row.id !== activity.id));
    } catch (error) {
      notify.fromError(error, "Failed to delete comment");
    }
  }

  return (
    <div className={className}>
      <div className="mb-3">
        <h3 className="ims-text-section">{title}</h3>
      </div>

      {!readOnly ? (
        <form className="mb-4 space-y-2" onSubmit={(e) => void handleCreate(e)}>
          <Textarea
            rows={3}
            value={draft}
            disabled={pending}
            placeholder="Write a comment…"
            aria-label="Comment"
            onChange={(event) => setDraft(event.target.value)}
          />
          {formError ? (
            <p className="text-xs text-destructive" role="alert">
              {formError}
            </p>
          ) : null}
          <Button type="submit" size="sm" disabled={pending || !draft.trim()}>
            {createMutation.isPending ? (
              <>
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                Saving…
              </>
            ) : (
              addLabel
            )}
          </Button>
        </form>
      ) : (
        <p className="mb-4 ims-text-meta">
          This timeline is read-only while the record is closed.
        </p>
      )}

      {listQuery.isLoading && items.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading activities…
        </div>
      ) : null}

      {listQuery.isError && items.length === 0 ? (
        <p className="ims-alert ims-alert-error" role="alert">
          {isApiClientError(listQuery.error)
            ? listQuery.error.message
            : "Failed to load activities"}
        </p>
      ) : null}

      {!listQuery.isLoading && !listQuery.isError && items.length === 0 ? (
        <EmptyState
          icon={<MessageSquare />}
          title={emptyTitle}
          description={emptyDescription}
        />
      ) : null}

      {items.length > 0 ? (
        <ul className="space-y-3">
          {items.map((activity) => (
            <li key={activity.id}>
              {editingId === activity.id ? (
                <form
                  className="space-y-2 rounded-md border border-border-subtle p-3"
                  onSubmit={(e) => void handleUpdate(e)}
                >
                  <Textarea
                    rows={3}
                    value={editDraft}
                    disabled={pending}
                    onChange={(event) => setEditDraft(event.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={pending}>
                      Update
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      onClick={() => {
                        setEditingId(null);
                        setEditDraft("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : activity.isAutomated ? (
                <AutomatedEntry activity={activity} />
              ) : (
                <ManualEntry
                  activity={activity}
                  canManage={
                    !readOnly && activity.createdBy === subjectId
                  }
                  pending={pending}
                  onEdit={(row) => {
                    setEditingId(row.id);
                    setEditDraft(row.value);
                  }}
                  onDelete={(row) => void handleDelete(row)}
                />
              )}
            </li>
          ))}
        </ul>
      ) : null}

      {hasMore ? (
        <div className="mt-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={listQuery.isFetching}
            onClick={() => setPage((current) => current + 1)}
          >
            {listQuery.isFetching ? (
              <>
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                Loading…
              </>
            ) : (
              "View more"
            )}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
