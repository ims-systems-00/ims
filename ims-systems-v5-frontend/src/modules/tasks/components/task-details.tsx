import { useState, type ReactNode } from "react";
import { Button } from "@/shared/components/ui/button";
import { UserDetailsSheet } from "@/modules/users";
import { useUserQuery } from "@/modules/users/hooks/use-users";
import { useFunctionalUnitQuery } from "@/modules/functional-units/hooks/use-functional-units";
import {
  AssigneeAcceptanceBadge,
  TaskPriorityBadge,
  TaskStatusBadge,
} from "./task-badges";
import type { Task } from "../types";

function Item({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
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
  if (!canOpen) {
    return <span>{name}</span>;
  }
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

function BusinessUnitLabel({ id }: { id?: string }) {
  const query = useFunctionalUnitQuery(id);
  if (!id) return <>—</>;
  return <>{query.data?.name ?? id}</>;
}

type TaskDetailsProps = {
  task: Task;
  onRemoveAttachment?: (attachmentId: string) => void;
  removingAttachmentId?: string | null;
};

/**
 * Reusable task details presentation for list sheets and future embeddings.
 */
export function TaskDetails({
  task,
  onRemoveAttachment,
  removingAttachmentId,
}: TaskDetailsProps) {
  const [userSheetId, setUserSheetId] = useState<string | null>(null);
  const activity = [...task.activity].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
  );
  const isComplete = task.status === "Complete";

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <TaskStatusBadge status={task.status} />
          <TaskPriorityBadge priority={task.priority} />
          <span className="ims-text-meta font-mono">{task.reference}</span>
          {task.teamPriority ? (
            <span className="ims-text-meta">Team task</span>
          ) : null}
        </div>
        <h3 className="text-base font-semibold tracking-tight">{task.name}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
          {task.description?.trim() || "No description provided."}
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="ims-text-section border-b border-border-subtle pb-2">
          Overview
        </h3>
        <dl className="ims-detail-grid">
          <Item label="Due" value={formatDate(task.dueDate)} />
          <Item
            label="Created by"
            value={
              <UserLabel
                userId={task.createdBy}
                onOpen={(id) => setUserSheetId(id)}
              />
            }
          />
          <Item label="Created" value={formatDate(task.createdOn)} />
          <Item label="Updated" value={formatDate(task.updatedOn)} />
          {task.teamPriority ? (
            <Item
              label="Functional unit"
              value={<BusinessUnitLabel id={task.businessUnitId} />}
            />
          ) : null}
          {task.source ? (
            <Item
              label="Source"
              value={`${task.source.moduleType} · ${task.source.moduleId}`}
            />
          ) : null}
          {isComplete ? (
            <>
              <Item
                label="Completed by"
                value={
                  <UserLabel
                    userId={task.completedBy}
                    onOpen={(id) => setUserSheetId(id)}
                  />
                }
              />
              <Item
                label="Completed on"
                value={formatDateTime(task.completedOn)}
              />
            </>
          ) : null}
        </dl>
      </section>

      <section className="space-y-2">
        <h3 className="ims-text-section border-b border-border-subtle pb-2">
          Assignees
        </h3>
        {task.assignees.length === 0 ? (
          <p className="ims-text-meta">No assignees.</p>
        ) : (
          <ul className="space-y-2">
            {task.assignees.map((assignee) => (
              <li
                key={assignee.userId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-border-subtle px-3 py-2 text-sm"
              >
                <UserLabel
                  userId={assignee.userId}
                  onOpen={(id) => setUserSheetId(id)}
                />
                <AssigneeAcceptanceBadge acceptance={assignee.acceptance} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="ims-text-section border-b border-border-subtle pb-2">
          Attachments
        </h3>
        {task.attachments.length === 0 ? (
          <p className="ims-text-meta">No attachments.</p>
        ) : (
          <ul className="space-y-2">
            {task.attachments.map((file) => (
              <li
                key={file.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-border-subtle px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  {file.url ? (
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium underline-offset-2 hover:underline"
                    >
                      {file.fileName}
                    </a>
                  ) : (
                    <span className="font-medium">{file.fileName}</span>
                  )}
                  <p className="ims-text-meta">
                    Added {formatDate(file.uploadedAt)}
                  </p>
                </div>
                {!isComplete && onRemoveAttachment ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={removingAttachmentId === file.id}
                    onClick={() => onRemoveAttachment(file.id)}
                  >
                    {removingAttachmentId === file.id ? "Removing…" : "Remove"}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="ims-text-section border-b border-border-subtle pb-2">
          Activity
        </h3>
        {activity.length === 0 ? (
          <p className="ims-text-meta">No activity recorded yet.</p>
        ) : (
          <ol className="space-y-3">
            {activity.map((entry) => (
              <li key={entry.id} className="text-sm">
                <p className="font-medium">{entry.message}</p>
                <p className="ims-text-meta">
                  {entry.type} · {formatDateTime(entry.at)}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <UserDetailsSheet
        userId={userSheetId}
        open={Boolean(userSheetId)}
        onOpenChange={(open) => {
          if (!open) setUserSheetId(null);
        }}
      />
    </div>
  );
}

export function TaskDetailsLoading() {
  return (
    <div className="space-y-4 animate-pulse" aria-busy="true">
      <div className="h-4 w-1/3 rounded bg-surface-muted" />
      <div className="h-6 w-2/3 rounded bg-surface-muted" />
      <div className="h-20 rounded bg-surface-muted" />
    </div>
  );
}

/**
 * Alias for embedding from other modules — same presentation as TaskDetails.
 */
export function TaskDetailsSheetContent(props: TaskDetailsProps) {
  return <TaskDetails {...props} />;
}
