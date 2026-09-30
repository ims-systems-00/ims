import { Button } from "@/shared/components/ui/button";
import { UserDetailsSheet } from "@/modules/users";
import { useUserQuery } from "@/modules/users/hooks/use-users";
import { useFunctionalUnitQuery } from "@/modules/functional-units/hooks/use-functional-units";
import { useState, type ReactNode } from "react";
import { RiskScoreAssessment } from "./risk-score-assessment";
import { RiskScoreBadge, RiskStatusBadge } from "./risk-badges";
import type { Risk } from "../types";

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

function OwnerLabel({
  ownerId,
  onOpen,
}: {
  ownerId?: string;
  onOpen: (id: string) => void;
}) {
  const query = useUserQuery(ownerId, Boolean(ownerId));
  if (!ownerId) return <>—</>;
  const name = query.data?.user.name ?? ownerId;
  return (
    <button
      type="button"
      className="text-left font-medium text-foreground underline-offset-2 hover:underline"
      onClick={() => onOpen(ownerId)}
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

export function RiskDetails({ risk }: { risk: Risk }) {
  const [ownerSheetId, setOwnerSheetId] = useState<string | null>(null);
  const activity = [...risk.activity].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
  );

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <RiskStatusBadge status={risk.displayStatus} />
          <RiskScoreBadge
            total={risk.currentScore.total}
            band={risk.scoreBand}
          />
          <span className="ims-text-meta font-mono">{risk.reference}</span>
        </div>
        <h3 className="text-base font-semibold tracking-tight">{risk.title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
          {risk.description}
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="ims-text-section border-b border-border-subtle pb-2">
          Overview
        </h3>
        <dl className="ims-detail-grid">
          <Item label="Type" value={risk.type} />
          <Item
            label="Business unit"
            value={<BusinessUnitLabel id={risk.businessUnitId} />}
          />
          <Item
            label="Owner"
            value={
              <OwnerLabel
                ownerId={risk.ownerId}
                onOpen={(id) => setOwnerSheetId(id)}
              />
            }
          />
          <Item label="Asset" value={risk.assetId ?? "—"} />
          <Item label="Raised" value={formatDate(risk.raisedOn)} />
          <Item label="Updated" value={formatDate(risk.updatedOn)} />
          {risk.source ? (
            <Item
              label="Source"
              value={`${risk.source.moduleType} · ${risk.source.moduleId}`}
            />
          ) : null}
        </dl>
      </section>

      <section className="space-y-3">
        <h3 className="ims-text-section border-b border-border-subtle pb-2">
          Assessment
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <RiskScoreAssessment
            score={risk.currentScore}
            band={risk.scoreBand}
            label="Current"
          />
          <div className="rounded-sm border border-border-subtle bg-surface-muted/40 p-3">
            <p className="ims-text-label">Initial (when raised)</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {risk.initialScore.total}
            </p>
            <p className="ims-text-meta mt-1 tabular-nums">
              L {risk.initialScore.likelihood} × C{" "}
              {risk.initialScore.consequence}
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="ims-text-section border-b border-border-subtle pb-2">
          Treatment
        </h3>
        <dl className="ims-detail-grid">
          <Item
            label="Mitigation"
            value={risk.mitigationText?.trim() || "—"}
          />
          <Item
            label="Mitigated"
            value={
              risk.mitigated.status
                ? `Yes · ${formatDate(risk.mitigated.on)}`
                : "No"
            }
          />
          <Item
            label="Acceptance"
            value={risk.acceptanceRationale?.trim() || "—"}
          />
          <Item label="Decision maker" value={risk.decisionMaker ?? "—"} />
          <Item
            label="Accepted"
            value={
              risk.accepted.status
                ? `Yes · ${formatDate(risk.accepted.on)}`
                : "No"
            }
          />
          <Item
            label="Escalated"
            value={
              risk.escalated.status
                ? `Yes · ${formatDate(risk.escalated.on)}`
                : "No"
            }
          />
        </dl>
      </section>

      {risk.complianceLinks.length > 0 ? (
        <section className="space-y-2">
          <h3 className="ims-text-section border-b border-border-subtle pb-2">
            Linked controls
          </h3>
          <ul className="space-y-2">
            {risk.complianceLinks.map((link) => (
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

      {risk.attachments.length > 0 ? (
        <section className="space-y-2">
          <h3 className="ims-text-section border-b border-border-subtle pb-2">
            Attachments
          </h3>
          <ul className="space-y-1 text-sm">
            {risk.attachments.map((file) => (
              <li key={file.id}>{file.fileName}</li>
            ))}
          </ul>
        </section>
      ) : null}

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
                  {entry.type} · {formatDate(entry.at)}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <UserDetailsSheet
        userId={ownerSheetId}
        open={Boolean(ownerSheetId)}
        onOpenChange={(open) => {
          if (!open) setOwnerSheetId(null);
        }}
      />
    </div>
  );
}

export function RiskDetailsLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-4 w-1/3 rounded bg-surface-muted" />
      <div className="h-6 w-2/3 rounded bg-surface-muted" />
      <div className="h-20 rounded bg-surface-muted" />
    </div>
  );
}

export function RiskFormActions({
  formId,
  submitLabel,
  pending,
  onCancel,
}: {
  formId: string;
  submitLabel: string;
  pending?: boolean;
  onCancel?: () => void;
}) {
  return (
    <>
      {onCancel ? (
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={onCancel}
        >
          Cancel
        </Button>
      ) : null}
      <Button type="submit" form={formId} disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </Button>
    </>
  );
}
