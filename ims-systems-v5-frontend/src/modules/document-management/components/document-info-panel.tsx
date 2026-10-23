import type { ReactNode } from "react";
import { StatusBadge } from "@/shared/components/status-badge";
import type { DocumentRepository, DocumentTreeNode } from "../types";
import { DOCUMENT_PURPOSE_LABELS } from "../types";
import {
  computeRepoReviewDate,
  formatDocumentDate,
  formatDocumentDateShort,
} from "../lib/format";
import { UserChip } from "./user-chip";

type DocumentInfoPanelProps = {
  node: DocumentTreeNode;
  repository: DocumentRepository;
  parentFolder: DocumentTreeNode | null;
  userNames: Record<string, string>;
};

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2 border-b border-border-subtle px-4 py-4 last:border-b-0">
      <h3 className="text-[0.75rem] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <div className="space-y-2 text-[0.8125rem]">{children}</div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <dt className="text-[0.75rem] text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-foreground">{children}</dd>
    </div>
  );
}

/**
 * Document metadata sidebar — purpose, version, review dates, owners.
 */
export function DocumentInfoPanel({
  node,
  repository,
  parentFolder,
  userNames,
}: DocumentInfoPanelProps) {
  const data = node.documentData;
  if (!data) {
    return (
      <aside className="rounded-md border border-border-subtle bg-card p-4 text-[0.8125rem] text-muted-foreground">
        No document metadata available.
      </aside>
    );
  }

  const repoReview = computeRepoReviewDate(
    repository.createdOn,
    repository.reviewInterval
  );
  const fileName = data.storageInfo?.Name || node.name;
  const versionLabel = `V${Math.max(data.dvID, 1)}`;

  return (
    <aside className="overflow-hidden rounded-md border border-border-subtle bg-card">
      <div className="border-b border-border-subtle px-4 py-3">
        <p className="text-[0.75rem] font-medium text-muted-foreground">
          Purpose:{" "}
          <span className="text-foreground">
            {DOCUMENT_PURPOSE_LABELS[data.purpose] ?? data.purpose}
          </span>
        </p>
      </div>

      <dl>
        <Section title="Document name">
          <p className="font-medium leading-snug">
            <span className="font-mono text-[0.75rem] text-muted-foreground">
              {node.reference}
            </span>{" "}
            {fileName}
          </p>
        </Section>

        <Section title="Repository">
          <p className="font-medium">{repository.name}</p>
        </Section>

        <Section title="Version control">
          <p className="font-medium">{versionLabel}</p>
        </Section>

        {data.conformance >= 0 ? (
          <Section title="Signature conformance">
            <div className="space-y-1.5">
              <div
                className="h-2 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuenow={data.conformance}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Signature conformance"
              >
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${data.conformance}%` }}
                />
              </div>
              <p className="text-[0.75rem] text-muted-foreground">
                {data.conformance}% of invited signers have signed
              </p>
            </div>
          </Section>
        ) : null}

        <Section title="Status">
          <StatusBadge
            tone={
              node.status === "Published"
                ? "success"
                : node.status === "Pending"
                  ? "warning"
                  : node.status === "Rejected"
                    ? "destructive"
                    : "neutral"
            }
          >
            {node.status}
          </StatusBadge>
        </Section>

        <Section title="Review dates">
          <Field label="Repo Review Date">
            {formatDocumentDate(repoReview)}
          </Field>
          <Field label="Folder Review Date">
            {formatDocumentDate(
              parentFolder?.folderData?.reviewDate ??
                node.folderData?.reviewDate
            )}
          </Field>
          <Field label="Document Review Date">
            {formatDocumentDate(data.reviewDate)}
          </Field>
        </Section>

        <Section title="Other information">
          <p>
            Document was uploaded on{" "}
            {formatDocumentDateShort(node.createdOn)}
          </p>
          <Field label="Audience">{repository.privacy}</Field>
          {data.classification ? (
            <Field label="Classification">{data.classification}</Field>
          ) : null}
          <Field label="Document owners">
            {data.owners.length === 0 ? (
              <span className="text-muted-foreground">—</span>
            ) : (
              <div className="flex flex-col gap-2 pt-1">
                {data.owners.map((id) => (
                  <UserChip key={id} userId={id} label={userNames[id]} />
                ))}
              </div>
            )}
          </Field>
        </Section>
      </dl>
    </aside>
  );
}
