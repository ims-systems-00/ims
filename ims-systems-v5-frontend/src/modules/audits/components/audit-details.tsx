import { useState, type FormEvent, type ReactNode } from "react";
import { FormField } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/toast";
import { UserDetailsSheet } from "@/modules/users";
import { useUserQuery } from "@/modules/users/hooks/use-users";
import { useFunctionalUnitQuery } from "@/modules/functional-units/hooks/use-functional-units";
import { useExtractAuditReportMutation } from "../hooks/use-audits";
import { extractReportFormSchema } from "../schemas";
import type { Audit } from "../types";
import { AuditIntervalBadge, AuditStatusBadge, AuditTypeBadge } from "./audit-badges";
import { AuditFindingsSection } from "./audit-findings-section";

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

type AuditDetailsProps = {
  audit: Audit;
  onRemoveAttachment?: (attachmentId: string) => void;
  removingAttachmentId?: string | null;
};

export function AuditDetails({
  audit,
  onRemoveAttachment,
  removingAttachmentId,
}: AuditDetailsProps) {
  const [userSheetId, setUserSheetId] = useState<string | null>(null);
  const completed = audit.completed.status;
  const editableFindings = !completed;

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-3 text-sm font-semibold tracking-tight">Overview</h3>
        <dl className="ims-detail-grid">
          <Item label="Reference" value={audit.reference} />
          <Item label="Status" value={<AuditStatusBadge status={audit.displayStatus} />} />
          <Item label="Type" value={<AuditTypeBadge type={audit.type} />} />
          <Item label="Focus area" value={audit.focusArea} />
          <Item
            label="Interval"
            value={<AuditIntervalBadge interval={audit.interval} />}
          />
          <Item label="Schedule date" value={formatDate(audit.startDate)} />
          <Item label="Time" value={audit.time || "—"} />
        </dl>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold tracking-tight">
          People & organisation
        </h3>
        <dl className="ims-detail-grid">
          <Item
            label="Auditor"
            value={
              <UserLabel userId={audit.auditorId} onOpen={setUserSheetId} />
            }
          />
          <Item
            label="Business unit"
            value={<UnitLabel id={audit.businessUnitId} />}
          />
          <Item
            label="Compliance body"
            value={<UnitLabel id={audit.complianceBodyId} />}
          />
          <Item
            label="Created by"
            value={
              <UserLabel userId={audit.createdBy} onOpen={setUserSheetId} />
            }
          />
          <Item label="Created" value={formatDateTime(audit.createdOn)} />
        </dl>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold tracking-tight">Findings</h3>
        <AuditFindingsSection audit={audit} editable={editableFindings} />
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold tracking-tight">Summary</h3>
        {audit.comment?.trim() ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {audit.comment}
          </p>
        ) : (
          <p className="ims-text-meta">No summary</p>
        )}
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold tracking-tight">
          Linked controls
        </h3>
        {audit.complianceLinks.length === 0 ? (
          <p className="ims-text-meta">No control linked</p>
        ) : (
          <ul className="space-y-2">
            {audit.complianceLinks.map((link) => (
              <li
                key={link.toolkitId}
                className="rounded-md border border-border px-3 py-2 text-sm"
              >
                <span className="font-medium">{link.toolkitId}</span>
                {link.clauseIds.length > 0 ? (
                  <span className="text-muted-foreground">
                    {" "}
                    — {link.clauseIds.join(", ")}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold tracking-tight">Attachments</h3>
        {audit.attachments.length === 0 ? (
          <p className="ims-text-meta">No attachment here</p>
        ) : (
          <ul className="space-y-2">
            {audit.attachments.map((file) => (
              <li
                key={file.id}
                className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
              >
                <span className="truncate">{file.fileName}</span>
                {onRemoveAttachment && !completed ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={removingAttachmentId === file.id}
                    onClick={() => onRemoveAttachment(file.id)}
                  >
                    Remove
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

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
                  userId={audit.completed.by}
                  onOpen={setUserSheetId}
                />
              }
            />
            <Item
              label="Completed on"
              value={formatDateTime(audit.completed.on)}
            />
          </dl>
          <p className="ims-text-meta mt-2">
            Non-conformities and embedded risks are promoted to Incidents and
            Risks with a source link to this audit. CIP promotion awaits the CIP
            module.
          </p>
        </section>
      ) : null}

      <ExtractReportPanel auditId={audit.id} />

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

function ExtractReportPanel({ auditId }: { auditId: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const mutation = useExtractAuditReportMutation(auditId);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = extractReportFormSchema.safeParse({
      recipientName: name,
      recipientEmail: email,
    });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    try {
      const result = await mutation.mutateAsync(parsed.data);
      notify.success(result.message);
      setName("");
      setEmail("");
      setErrors({});
    } catch (error) {
      notify.fromError(error, "Unable to send audit report");
    }
  }

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold tracking-tight">Extract report</h3>
      <form className="space-y-3" onSubmit={(e) => void handleSubmit(e)}>
        <FormField label="Recipient name" required error={errors.recipientName}>
          <input
            className="ims-field"
            value={name}
            disabled={mutation.isPending}
            onChange={(event) => setName(event.target.value)}
          />
        </FormField>
        <FormField
          label="Recipient email"
          required
          error={errors.recipientEmail}
        >
          <input
            type="email"
            className="ims-field"
            value={email}
            disabled={mutation.isPending}
            onChange={(event) => setEmail(event.target.value)}
          />
        </FormField>
        <Button type="submit" size="sm" disabled={mutation.isPending}>
          {mutation.isPending ? "Sending…" : "Send report"}
        </Button>
      </form>
    </section>
  );
}

export function AuditDetailsLoading() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
      <div className="h-20 animate-pulse rounded bg-muted" />
      <div className="h-20 animate-pulse rounded bg-muted" />
    </div>
  );
}
