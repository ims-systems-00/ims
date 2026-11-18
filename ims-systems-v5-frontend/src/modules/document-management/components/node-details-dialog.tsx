import type { ReactNode } from "react";
import { StatusBadge } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { BusinessUnitLabel } from "@/modules/functional-units";
import type { DocumentRepository, DocumentTreeNode } from "../types";
import { DOCUMENT_PURPOSE_LABELS } from "../types";
import {
  computeRepoReviewDate,
  formatDocumentDateLong,
  formatReviewDateDisplay,
} from "../lib/format";
import { UserChip } from "./user-chip";

type NodeDetailsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repository: DocumentRepository;
  node: DocumentTreeNode | null;
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
    <div className="grid grid-cols-[8rem_1fr] gap-2 border-b border-border-subtle py-2.5 text-[0.8125rem] last:border-b-0">
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

function resolveFolderReviewDate(input: {
  node: DocumentTreeNode;
  visitingFolder: DocumentTreeNode | null | undefined;
  repoReviewLabel: string;
}): string {
  const { node, visitingFolder, repoReviewLabel } = input;
  if (node.type === "folder") {
    return formatReviewDateDisplay(node.folderData?.reviewDate);
  }
  if (!node.parentNodeId) return repoReviewLabel;
  const parentReview = visitingFolder?.folderData?.reviewDate ?? null;
  return parentReview
    ? formatReviewDateDisplay(parentReview)
    : repoReviewLabel;
}

/**
 * Modal with full folder/document details (Actions → Details).
 */
export function NodeDetailsDialog({
  open,
  onOpenChange,
  repository,
  node,
  visitingFolder,
  userNames,
}: NodeDetailsDialogProps) {
  if (!node) return null;

  const repoReview = computeRepoReviewDate(
    repository.createdOn,
    repository.reviewInterval
  );
  const repoReviewLabel = formatReviewDateDisplay(repoReview);
  const folderReviewLabel = resolveFolderReviewDate({
    node,
    visitingFolder,
    repoReviewLabel,
  });
  const title =
    node.type === "folder" ? "Folder details" : "Document details";

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {node.reference} · {node.name}
          </DialogDescription>
        </DialogHeader>

        <dl className="rounded-md border border-border-subtle px-3 py-1">
          {node.type === "document" && node.documentData ? (
            <>
              <Row label="Document">{node.name}</Row>
              <Row label="Reference">{node.reference}</Row>
              <Row label="Purpose">
                {DOCUMENT_PURPOSE_LABELS[node.documentData.purpose] ??
                  node.documentData.purpose}
              </Row>
              <Row label="Status">
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
              </Row>
              <Row label="Version">v{node.documentData.dvID}</Row>
              <Row label="Repo Review Date">{repoReviewLabel}</Row>
              <Row label="Folder Review Date">{folderReviewLabel}</Row>
              <Row label="Document Review Date">
                {formatReviewDateDisplay(node.documentData.reviewDate)}
              </Row>
              <Row label="Modified By">
                {node.updatedBy ? (
                  <UserChip
                    userId={node.updatedBy}
                    label={userNames[node.updatedBy]}
                  />
                ) : (
                  "—"
                )}
              </Row>
              <Row label="Modified Date">
                {formatDocumentDateLong(node.updatedOn ?? node.updatedAt)}
              </Row>
              <Row label="Document Owner(s)">
                <People
                  ids={node.documentData.owners}
                  userNames={userNames}
                />
              </Row>
              {node.documentData.storageInfo?.Name ? (
                <Row label="File">
                  {node.documentData.storageInfo.Name}
                </Row>
              ) : null}
              {repoBlock}
            </>
          ) : null}

          {node.type === "folder" ? (
            <>
              <Row label="Folder">{node.name}</Row>
              <Row label="Reference">{node.reference}</Row>
              <Row label="Repo Review Date">{repoReviewLabel}</Row>
              <Row label="Folder Review Date">{folderReviewLabel}</Row>
              <Row label="Modified By">
                {node.folderData?.modifiedBy ? (
                  <UserChip
                    userId={node.folderData.modifiedBy}
                    label={userNames[node.folderData.modifiedBy]}
                  />
                ) : node.updatedBy ? (
                  <UserChip
                    userId={node.updatedBy}
                    label={userNames[node.updatedBy]}
                  />
                ) : (
                  "—"
                )}
              </Row>
              <Row label="Modified Date">
                {formatDocumentDateLong(
                  node.folderData?.modifiedOn ??
                    node.updatedOn ??
                    node.updatedAt
                )}
              </Row>
              {repoBlock}
            </>
          ) : null}
        </dl>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
