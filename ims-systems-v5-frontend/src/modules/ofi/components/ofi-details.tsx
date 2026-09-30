import { useState, type FormEvent, type ReactNode } from "react";
import { FormField } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/toast";
import { UserDetailsSheet } from "@/modules/users";
import { useUserQuery } from "@/modules/users/hooks/use-users";
import { useFunctionalUnitQuery } from "@/modules/functional-units/hooks/use-functional-units";
import {
  useAddOfiActivityMutation,
  useRemoveOfiAttachmentMutation,
  useUpdateOfiMutation,
} from "../hooks/use-ofi";
import { addOfiActivityFormSchema, attachmentFormSchema } from "../schemas";
import type { Ofi } from "../types";
import { OfiStatusBadge } from "./ofi-badges";
import { OfiRelatedTasks } from "./ofi-related-tasks";

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

type OfiDetailsProps = {
  ofi: Ofi;
};

/**
 * Reusable OFI details for list sheets and embeddings.
 */
export function OfiDetails({ ofi }: OfiDetailsProps) {
  const [userSheetId, setUserSheetId] = useState<string | null>(null);
  const [activityMessage, setActivityMessage] = useState("");
  const [activityError, setActivityError] = useState<string | undefined>();
  const [attachName, setAttachName] = useState("");
  const [attachUrl, setAttachUrl] = useState("");
  const [attachError, setAttachError] = useState<string | undefined>();
  const [removingAttachmentId, setRemovingAttachmentId] = useState<
    string | null
  >(null);

  const implemented = ofi.implemented.status === "Implemented";
  const addActivityMutation = useAddOfiActivityMutation(ofi.id);
  const updateMutation = useUpdateOfiMutation(ofi.id);
  const removeAttachmentMutation = useRemoveOfiAttachmentMutation(ofi.id);

  const activity = [...ofi.activity].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
  );

  async function handleAddActivity(event: FormEvent) {
    event.preventDefault();
    const parsed = addOfiActivityFormSchema.safeParse({
      message: activityMessage,
    });
    if (!parsed.success) {
      setActivityError(parsed.error.issues[0]?.message ?? "Invalid message");
      return;
    }
    setActivityError(undefined);
    try {
      await addActivityMutation.mutateAsync(parsed.data.message);
      setActivityMessage("");
      notify.success(
        ofi.displayStatus === "Pending"
          ? "Activity recorded — status moved to In Progress"
          : "Activity recorded"
      );
    } catch (error) {
      notify.fromError(error, "Unable to add activity");
    }
  }

  async function handleAddAttachment(event: FormEvent) {
    event.preventDefault();
    const parsed = attachmentFormSchema.safeParse({
      fileName: attachName,
      url: attachUrl || undefined,
    });
    if (!parsed.success) {
      setAttachError(parsed.error.issues[0]?.message ?? "Invalid attachment");
      return;
    }
    setAttachError(undefined);
    try {
      await updateMutation.mutateAsync({
        attachments: [
          {
            fileName: parsed.data.fileName,
            url: parsed.data.url || undefined,
          },
        ],
      });
      setAttachName("");
      setAttachUrl("");
      notify.success("Attachment added");
    } catch (error) {
      notify.fromError(error, "Unable to add attachment");
    }
  }

  async function handleRemoveAttachment(attachmentId: string) {
    setRemovingAttachmentId(attachmentId);
    try {
      await removeAttachmentMutation.mutateAsync(attachmentId);
      notify.success("Attachment removed");
    } catch (error) {
      notify.fromError(error, "Unable to remove attachment");
    } finally {
      setRemovingAttachmentId(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <OfiStatusBadge status={ofi.displayStatus} />
          <span className="ims-text-meta font-mono">{ofi.reference}</span>
        </div>
        <h3 className="text-base font-semibold tracking-tight">{ofi.title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
          {ofi.opportunityForImprovement}
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="ims-text-section border-b border-border-subtle pb-2">
          Overview
        </h3>
        <dl className="ims-detail-grid">
          <Item
            label="Business unit"
            value={<BusinessUnitLabel id={ofi.businessUnitId} />}
          />
          <Item
            label="Owner"
            value={
              <UserLabel
                userId={ofi.ownerId}
                onOpen={(id) => setUserSheetId(id)}
              />
            }
          />
          <Item
            label="Raised by"
            value={
              <UserLabel
                userId={ofi.createdBy}
                onOpen={(id) => setUserSheetId(id)}
              />
            }
          />
          <Item label="Raised" value={formatDate(ofi.createdOn)} />
          <Item
            label="Estimated cost"
            value={ofi.cost != null ? ofi.cost.toLocaleString() : "—"}
          />
          {ofi.source ? (
            <Item
              label="Source"
              value={`${ofi.source.moduleType} · ${ofi.source.moduleId}`}
            />
          ) : null}
          <Item label="Updated" value={formatDate(ofi.updatedOn)} />
        </dl>
      </section>

      {implemented ? (
        <section className="space-y-2">
          <h3 className="ims-text-section border-b border-border-subtle pb-2">
            Implementation
          </h3>
          <dl className="ims-detail-grid">
            <Item
              label="Implemented by"
              value={
                <UserLabel
                  userId={ofi.implemented.by}
                  onOpen={(id) => setUserSheetId(id)}
                />
              }
            />
            <Item
              label="Implemented on"
              value={formatDateTime(ofi.implemented.on)}
            />
          </dl>
        </section>
      ) : null}

      {ofi.complianceLinks.length > 0 ? (
        <section className="space-y-2">
          <h3 className="ims-text-section border-b border-border-subtle pb-2">
            Linked controls
          </h3>
          <ul className="space-y-2">
            {ofi.complianceLinks.map((link) => (
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

      <section className="space-y-3">
        <h3 className="ims-text-section border-b border-border-subtle pb-2">
          Attachments
        </h3>
        {ofi.attachments.length === 0 ? (
          <p className="ims-text-meta">No attachments.</p>
        ) : (
          <ul className="space-y-2">
            {ofi.attachments.map((file) => (
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
                {!implemented ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={removingAttachmentId === file.id}
                    onClick={() => void handleRemoveAttachment(file.id)}
                  >
                    {removingAttachmentId === file.id ? "Removing…" : "Remove"}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {!implemented ? (
          <form
            className="space-y-3 rounded-sm border border-border-subtle p-3"
            onSubmit={(e) => void handleAddAttachment(e)}
          >
            <p className="text-sm font-medium">Add attachment metadata</p>
            <FormField label="File name" required error={attachError}>
              <input
                className="ims-field"
                value={attachName}
                disabled={updateMutation.isPending}
                onChange={(event) => setAttachName(event.target.value)}
              />
            </FormField>
            <FormField label="URL" description="Optional link to the file">
              <input
                className="ims-field"
                value={attachUrl}
                disabled={updateMutation.isPending}
                placeholder="https://…"
                onChange={(event) => setAttachUrl(event.target.value)}
              />
            </FormField>
            <div className="flex justify-end">
              <Button
                type="submit"
                size="sm"
                variant="outline"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? "Adding…" : "Add attachment"}
              </Button>
            </div>
          </form>
        ) : null}
      </section>

      <OfiRelatedTasks
        ofiId={ofi.id}
        businessUnitId={ofi.businessUnitId}
        canLink={!implemented}
      />

      <section className="space-y-3">
        <h3 className="ims-text-section border-b border-border-subtle pb-2">
          Activity
        </h3>
        {activity.length === 0 ? (
          <p className="ims-text-meta">No activity recorded yet.</p>
        ) : (
          <ol className="space-y-3">
            {activity.map((entry) => (
              <li key={entry.id} className="text-sm">
                <p className="font-medium whitespace-pre-wrap">{entry.message}</p>
                <p className="ims-text-meta">
                  {entry.type} · {formatDateTime(entry.at)}
                </p>
              </li>
            ))}
          </ol>
        )}

        {!implemented ? (
          <form
            className="space-y-3 rounded-sm border border-border-subtle p-3"
            onSubmit={(e) => void handleAddActivity(e)}
          >
            <FormField
              label="Add progress note"
              required
              error={activityError}
              description={
                ofi.displayStatus === "Pending"
                  ? "The first activity moves this OFI from Pending to In Progress."
                  : undefined
              }
            >
              <textarea
                className="ims-field min-h-[4.5rem] py-2 leading-relaxed"
                value={activityMessage}
                disabled={addActivityMutation.isPending}
                onChange={(event) => setActivityMessage(event.target.value)}
              />
            </FormField>
            <div className="flex justify-end">
              <Button
                type="submit"
                size="sm"
                disabled={addActivityMutation.isPending}
              >
                {addActivityMutation.isPending ? "Saving…" : "Add activity"}
              </Button>
            </div>
          </form>
        ) : null}
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

export function OfiDetailsLoading() {
  return (
    <div className="space-y-4 animate-pulse" aria-busy="true">
      <div className="h-4 w-1/3 rounded bg-surface-muted" />
      <div className="h-6 w-2/3 rounded bg-surface-muted" />
      <div className="h-20 rounded bg-surface-muted" />
    </div>
  );
}
