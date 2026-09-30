import { useState, type ReactNode } from "react";
import { Button } from "@/shared/components/ui/button";
import { UserDetailsSheet } from "@/modules/users";
import { useUserQuery } from "@/modules/users/hooks/use-users";
import { useFunctionalUnitQuery } from "@/modules/functional-units/hooks/use-functional-units";
import {
  IncidentPriorityBadge,
  IncidentStatusBadge,
} from "./incident-badges";
import { formatResolutionTime, type Incident } from "../types";

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

function BusinessUnitLabel({ id }: { id?: string }) {
  const query = useFunctionalUnitQuery(id);
  if (!id) return <>—</>;
  return <>{query.data?.name ?? id}</>;
}

type IncidentDetailsProps = {
  incident: Incident;
  onRemoveAttachment?: (attachmentId: string) => void;
  removingAttachmentId?: string | null;
};

/**
 * Reusable incident details presentation for list sheets and embeddings.
 */
export function IncidentDetails({
  incident,
  onRemoveAttachment,
  removingAttachmentId,
}: IncidentDetailsProps) {
  const [userSheetId, setUserSheetId] = useState<string | null>(null);
  const activity = [...incident.activity].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
  );
  const isResolved = incident.resolved.status;

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <IncidentStatusBadge status={incident.displayStatus} />
          <IncidentPriorityBadge priority={incident.priority} />
          <span className="ims-text-meta font-mono">{incident.reference}</span>
        </div>
        <h3 className="text-base font-semibold tracking-tight">
          {incident.title}
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
          {incident.description}
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="ims-text-section border-b border-border-subtle pb-2">
          Overview
        </h3>
        <dl className="ims-detail-grid">
          <Item
            label="Business unit"
            value={<BusinessUnitLabel id={incident.businessUnitId} />}
          />
          <Item
            label="Owner"
            value={
              <UserLabel
                userId={incident.ownerId}
                onOpen={(id) => setUserSheetId(id)}
              />
            }
          />
          <Item
            label="Raised by"
            value={
              <UserLabel
                userId={incident.raisedBy}
                onOpen={(id) => setUserSheetId(id)}
              />
            }
          />
          <Item label="Raised" value={formatDate(incident.raisedOn)} />
          <Item label="Privacy" value={incident.privacy} />
          <Item
            label="Notification method"
            value={incident.methodOfNotification?.trim() || "—"}
          />
          <Item
            label="Affected service"
            value={incident.affectedService?.trim() || "—"}
          />
          {incident.source ? (
            <Item
              label="Source"
              value={`${incident.source.moduleType} · ${incident.source.moduleId}`}
            />
          ) : null}
          {isResolved ? (
            <Item
              label="Resolution time"
              value={formatResolutionTime(incident.resolutionTimeMs)}
            />
          ) : null}
        </dl>
      </section>

      {(incident.resolution || isResolved) && (
        <section className="space-y-2">
          <h3 className="ims-text-section border-b border-border-subtle pb-2">
            Resolution
          </h3>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {incident.resolution?.trim() || "—"}
          </p>
          <dl className="ims-detail-grid">
            <Item
              label="Resolved by"
              value={
                <UserLabel
                  userId={incident.resolved.by}
                  onOpen={(id) => setUserSheetId(id)}
                />
              }
            />
            <Item
              label="Resolved on"
              value={formatDateTime(incident.resolved.on)}
            />
          </dl>
        </section>
      )}

      <section className="space-y-2">
        <h3 className="ims-text-section border-b border-border-subtle pb-2">
          Lifecycle
        </h3>
        <dl className="ims-detail-grid">
          <Item
            label="Escalated"
            value={
              incident.escalated.status
                ? `Yes · ${formatDateTime(incident.escalated.on)}`
                : "No"
            }
          />
          <Item
            label="Escalated by"
            value={
              incident.escalated.status ? (
                <UserLabel
                  userId={incident.escalated.by}
                  onOpen={(id) => setUserSheetId(id)}
                />
              ) : (
                "—"
              )
            }
          />
          <Item label="Updated" value={formatDate(incident.updatedOn)} />
        </dl>
      </section>

      {incident.complianceLinks.length > 0 ? (
        <section className="space-y-2">
          <h3 className="ims-text-section border-b border-border-subtle pb-2">
            Linked controls
          </h3>
          <ul className="space-y-2">
            {incident.complianceLinks.map((link) => (
              <li
                key={link.toolkitId}
                className="rounded-sm border border-border-subtle px-3 py-2 text-sm"
              >
                <p className="font-medium">{link.toolkitId}</p>
                <p className="ims-text-meta">
                  {link.clauseIds.length > 0
                    ? link.clauseIds.join(", ")
                    : "No clauses"}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-2">
        <h3 className="ims-text-section border-b border-border-subtle pb-2">
          Attachments
        </h3>
        {incident.attachments.length === 0 ? (
          <p className="ims-text-meta">No attachments.</p>
        ) : (
          <ul className="space-y-2">
            {incident.attachments.map((file) => (
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
                {!isResolved && onRemoveAttachment ? (
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

export function IncidentDetailsLoading() {
  return (
    <div className="space-y-4 animate-pulse" aria-busy="true">
      <div className="h-4 w-1/3 rounded bg-surface-muted" />
      <div className="h-6 w-2/3 rounded bg-surface-muted" />
      <div className="h-20 rounded bg-surface-muted" />
    </div>
  );
}
