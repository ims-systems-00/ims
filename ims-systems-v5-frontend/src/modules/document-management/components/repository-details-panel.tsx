import type { ReactNode } from "react";
import { StatusBadge } from "@/shared/components/status-badge";
import { BusinessUnitLabel } from "@/modules/functional-units";
import type { DocumentRepository, DocumentTreeNode } from "../types";
import { DOCUMENT_PURPOSE_LABELS } from "../types";
import {
  computeRepoReviewDate,
  formatDocumentDateLong,
  formatReviewDateDisplay,
} from "../lib/format";
import { UserChip } from "./user-chip";

type RepositoryDetailsPanelProps = {
  repository: DocumentRepository;
  selected: DocumentTreeNode | null;
  /** Current folder being browsed (for document folder-review fallback). */
  visitingFolder?: DocumentTreeNode | null;
  userNames: Record<string, string>;
};

function Row({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-2 border-b border-border-subtle py-2.5 text-[0.8125rem] last:border-b-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-foreground">{children}</dd>
    </div>
  );
}

function People({
  ids,
  userNames,
}: {
  ids: string[];
  userNames: Record<string, string>;
}) {
  if (ids.length === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex flex-col gap-1.5">
      {ids.map((id) => (
        <UserChip key={id} userId={id} label={userNames[id]} />
      ))}
    </div>
  );
}

/**
 * Resolve folder review date like V4 AboutRepository:
 * - selected folder → its own folderData.reviewDate (or Not set)
 * - selected document → visiting/parent folder date, else repo-derived date
 */
function resolveFolderReviewDate(input: {
  selected: DocumentTreeNode | null;
  visitingFolder: DocumentTreeNode | null | undefined;
  repoReviewLabel: string;
}): string | null {
  const { selected, visitingFolder, repoReviewLabel } = input;
  if (!selected) return null;

  if (selected.type === "folder") {
    return formatReviewDateDisplay(selected.folderData?.reviewDate);
  }

  if (selected.type === "document") {
    if (!selected.parentNodeId) {
      return repoReviewLabel;
    }
    const parentReview =
      visitingFolder?.folderData?.reviewDate ?? null;
    return parentReview
      ? formatReviewDateDisplay(parentReview)
      : repoReviewLabel;
  }

  return null;
}

/**
 * Right-rail details: repository summary, or folder/document when selected.
 */
export function RepositoryDetailsPanel({
  repository,
  selected,
  visitingFolder,
  userNames,
}: RepositoryDetailsPanelProps) {
  const repoReview = computeRepoReviewDate(
    repository.createdOn,
    repository.reviewInterval
  );
  const repoReviewLabel = formatReviewDateDisplay(repoReview);
  const folderReviewLabel = resolveFolderReviewDate({
    selected,
    visitingFolder,
    repoReviewLabel,
  });

  const repoBlock = (
    <>
      <Row label="Repository Name">{repository.name}</Row>
      <Row label="Owner(s)">
        <People ids={repository.owners} userNames={userNames} />
      </Row>
      <Row label="Created By">
        <UserChip
          userId={repository.createdBy}
          label={userNames[repository.createdBy]}
        />
      </Row>
      <Row label="Privacy">{repository.privacy}</Row>
      <Row label="Business unit">
        {repository.businessUnitId ? (
          <BusinessUnitLabel id={repository.businessUnitId} />
        ) : (
          "N/A"
        )}
      </Row>
      <Row label="Created Date">
        {formatDocumentDateLong(repository.createdOn)}
      </Row>
      <Row label="Review interval">{repository.reviewInterval}</Row>
      <Row label="Repo Review Date">{repoReviewLabel}</Row>
    </>
  );

  return (
    <aside className="rounded-md border border-border-subtle bg-card">
      <div className="border-b border-border-subtle px-3 py-2.5">
        <h2 className="text-[0.8125rem] font-semibold tracking-tight">
          {selected
            ? selected.type === "folder"
              ? "Folder details"
              : "Document details"
            : "Repository details"}
        </h2>
      </div>
      <dl className="px-3 py-1">
        {selected?.type === "document" && selected.documentData ? (
          <>
            <Row label="Document">{selected.name}</Row>
            <Row label="Purpose">
              {DOCUMENT_PURPOSE_LABELS[selected.documentData.purpose] ??
                selected.documentData.purpose}
            </Row>
            <Row label="Status">
              <StatusBadge
                tone={
                  selected.status === "Published"
                    ? "success"
                    : selected.status === "Pending"
                      ? "warning"
                      : selected.status === "Rejected"
                        ? "destructive"
                        : "neutral"
                }
              >
                {selected.status}
              </StatusBadge>
            </Row>
            <Row label="Version">v{selected.documentData.dvID}</Row>
            <Row label="Repo Review Date">{repoReviewLabel}</Row>
            {folderReviewLabel !== null ? (
              <Row label="Folder Review Date">{folderReviewLabel}</Row>
            ) : null}
            <Row label="Document Review Date">
              {formatReviewDateDisplay(selected.documentData.reviewDate)}
            </Row>
            <Row label="Modified By">
              {selected.updatedBy ? (
                <UserChip
                  userId={selected.updatedBy}
                  label={userNames[selected.updatedBy]}
                />
              ) : (
                "—"
              )}
            </Row>
            <Row label="Modified Date">
              {formatDocumentDateLong(selected.updatedOn ?? selected.updatedAt)}
            </Row>
            <Row label="Document Owner(s)">
              <People
                ids={selected.documentData.owners}
                userNames={userNames}
              />
            </Row>
            {repoBlock}
          </>
        ) : null}

        {selected?.type === "folder" ? (
          <>
            <Row label="Folder">{selected.name}</Row>
            <Row label="Repo Review Date">{repoReviewLabel}</Row>
            <Row label="Folder Review Date">
              {folderReviewLabel ?? "Not set"}
            </Row>
            <Row label="Modified By">
              {selected.folderData?.modifiedBy ? (
                <UserChip
                  userId={selected.folderData.modifiedBy}
                  label={userNames[selected.folderData.modifiedBy]}
                />
              ) : selected.updatedBy ? (
                <UserChip
                  userId={selected.updatedBy}
                  label={userNames[selected.updatedBy]}
                />
              ) : (
                "—"
              )}
            </Row>
            <Row label="Modified Date">
              {formatDocumentDateLong(
                selected.folderData?.modifiedOn ??
                  selected.updatedOn ??
                  selected.updatedAt
              )}
            </Row>
            {repoBlock}
          </>
        ) : null}

        {!selected ? repoBlock : null}
      </dl>
    </aside>
  );
}
