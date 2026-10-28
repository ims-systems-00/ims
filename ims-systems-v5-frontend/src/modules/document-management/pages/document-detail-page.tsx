import { useMemo, useState } from "react";
import { ArrowLeft, Loader2, Share2 } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { EmptyState } from "@/shared/components/empty-state";
import { Button } from "@/shared/components/ui/button";
import { PageHeader } from "@/shared/layout";
import { cn } from "@/shared/lib/utils";
import { useUsersQuery } from "@/modules/users/hooks/use-users";
import { DocumentInfoPanel } from "../components/document-info-panel";
import { DocumentPreviewPanel } from "../components/document-preview-panel";
import { DocumentVersionsPanel } from "../components/document-versions-panel";
import { DocumentAuditTrailPanel } from "../components/document-audit-trail-panel";
import { ActivityTimeline } from "@/modules/activities";
import { DocumentUpdateDialog } from "../components/document-update-dialog";
import { NewVersionSheet } from "../components/new-version-sheet";
import { RequestSignatureDialog } from "../components/request-signature-dialog";
import { ShareDocumentDialog } from "../components/share-document-dialog";
import { DocumentSignaturesPanel } from "../components/document-signatures-panel";
import { SignedDocumentPanel } from "../components/signed-document-panel";
import { DocumentComplianceSettingsPanel } from "../components/document-compliance-settings-panel";
import {
  useDocumentRepositoryQuery,
  useRepoNodeQuery,
  useSignaturesQuery,
} from "../hooks/use-document-management";

type DocumentTabId =
  | "overview"
  | "new-version"
  | "request-signature"
  | "signed"
  | "activities"
  | "versions"
  | "update"
  | "audit-trail"
  | "compliance-settings";

const TABS: Array<{ id: DocumentTabId; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "new-version", label: "Add new version" },
  { id: "request-signature", label: "Request signature" },
  { id: "signed", label: "Signed document" },
  { id: "activities", label: "Activities" },
  { id: "versions", label: "Versions" },
  { id: "update", label: "Update" },
  { id: "audit-trail", label: "Audit trail" },
  { id: "compliance-settings", label: "Compliance Settings" },
];

/**
 * Individual document page — preview, metadata, and action tabs.
 */
export function DocumentDetailPage() {
  const params = useParams<{ id: string; nodeId: string }>();
  const repositoryId = params.id;
  const nodeId = params.nodeId;

  const [tab, setTab] = useState<DocumentTabId>("overview");
  const [updateOpen, setUpdateOpen] = useState(false);
  const [versionOpen, setVersionOpen] = useState(false);
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const repoQuery = useDocumentRepositoryQuery(repositoryId);
  const nodeQuery = useRepoNodeQuery(repositoryId, nodeId);
  const parentId = nodeQuery.data?.parentNodeId ?? undefined;
  const parentQuery = useRepoNodeQuery(repositoryId, parentId);
  const usersQuery = useUsersQuery({ page: 1, pageSize: 100 });
  const signaturesQuery = useSignaturesQuery(repositoryId, nodeId);
  const signatureCount = signaturesQuery.data?.length ?? 0;
  const signedCopyCount = (signaturesQuery.data ?? []).filter(
    (row) => row.status === "Signed" && row.signedCopy
  ).length;

  const userNames = useMemo(() => {
    const map: Record<string, string> = {
      "dev-stub-user": "Dev stub user",
      "demo-seed": "Demo seed",
    };
    for (const row of usersQuery.data?.items ?? []) {
      map[row.user.id] = row.user.name?.trim() || row.user.email;
    }
    return map;
  }, [usersQuery.data?.items]);

  function handleTabChange(next: DocumentTabId) {
    if (next === "new-version") {
      setVersionOpen(true);
      setTab("overview");
      return;
    }
    if (next === "update") {
      setUpdateOpen(true);
      setTab("overview");
      return;
    }
    if (next === "request-signature") {
      setSignatureOpen(true);
      setTab("request-signature");
      return;
    }
    setTab(next);
  }

  if (!repositoryId || !nodeId) {
    return (
      <EmptyState
        title="Missing document"
        description="No repository or document id was provided in the URL."
      />
    );
  }

  if (repoQuery.isLoading || nodeQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 text-[0.8125rem] text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading document…
      </div>
    );
  }

  if (repoQuery.isError || !repoQuery.data) {
    return (
      <EmptyState
        title="Repository not found"
        description="This repository could not be loaded."
        action={
          <Button type="button" variant="outline" asChild>
            <Link to="/documents">Back to documents</Link>
          </Button>
        }
      />
    );
  }

  if (nodeQuery.isError || !nodeQuery.data) {
    return (
      <EmptyState
        title="Document not found"
        description="This document could not be loaded."
        action={
          <Button type="button" variant="outline" asChild>
            <Link to={`/documents/repositories/${repositoryId}`}>
              Back to repository
            </Link>
          </Button>
        }
      />
    );
  }

  const node = nodeQuery.data;
  if (node.type !== "document") {
    return (
      <EmptyState
        title="Not a document"
        description="This node is a folder. Open it from the repository browser."
        action={
          <Button type="button" variant="outline" asChild>
            <Link to={`/documents/repositories/${repositoryId}`}>
              Back to repository
            </Link>
          </Button>
        }
      />
    );
  }

  const parentFolder =
    parentQuery.data?.type === "folder" ? parentQuery.data : null;
  const canAddVersion = node.status === "Published";

  return (
    <div className="space-y-5">
      <PageHeader
        title={node.name}
        description={`${node.reference} · ${repoQuery.data.name}`}
        actions={
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShareOpen(true)}
            >
              <Share2 className="size-3.5" />
              Share
            </Button>
            <Button type="button" variant="outline" size="sm" asChild>
              <Link to={`/documents/repositories/${repositoryId}`}>
                <ArrowLeft className="size-3.5" />
                Back to repository
              </Link>
            </Button>
          </div>
        }
      />

      <div
        className="flex flex-wrap gap-1 border-b border-border-subtle"
        role="tablist"
        aria-label="Document actions"
      >
        {TABS.map((item) => {
          const selected = tab === item.id;
          const disabled =
            item.id === "new-version" && !canAddVersion;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              disabled={disabled}
              title={
                disabled
                  ? "New version is only available for published documents"
                  : undefined
              }
              className={cn(
                "relative px-3 py-2.5 text-sm font-medium transition-colors",
                selected
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
                disabled && "cursor-not-allowed opacity-40"
              )}
              onClick={() => handleTabChange(item.id)}
            >
              {item.label}
              {item.id === "request-signature" && signatureCount > 0 ? (
                <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[0.65rem] tabular-nums text-muted-foreground">
                  {signatureCount}
                </span>
              ) : null}
              {item.id === "signed" && signedCopyCount > 0 ? (
                <span className="ml-1.5 rounded-full bg-success/15 px-1.5 py-0.5 text-[0.65rem] tabular-nums text-success">
                  {signedCopyCount}
                </span>
              ) : null}
              {selected ? (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
              ) : null}
            </button>
          );
        })}
      </div>

      {tab === "overview" || tab === "request-signature" ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <DocumentPreviewPanel
            storageInfo={node.documentData?.storageInfo}
            title={node.name}
          />
          <DocumentInfoPanel
            node={node}
            repository={repoQuery.data}
            parentFolder={parentFolder}
            userNames={userNames}
          />
        </div>
      ) : null}

      {tab === "activities" ? (
        <ActivityTimeline
          moduleType="documenttrees"
          moduleId={nodeId}
          title="Activities"
          emptyTitle="No activities yet"
          emptyDescription="Comments, authorisation, version and signature events for this document will appear here."
        />
      ) : null}

      {tab === "versions" ? (
        <DocumentVersionsPanel
          repositoryId={repositoryId}
          nodeId={nodeId}
          userNames={userNames}
        />
      ) : null}

      {tab === "audit-trail" ? (
        <DocumentAuditTrailPanel nodeId={nodeId} userNames={userNames} />
      ) : null}

      {tab === "request-signature" ? (
        <DocumentSignaturesPanel
          repositoryId={repositoryId}
          node={node}
          onRequestSignature={() => setSignatureOpen(true)}
        />
      ) : null}

      {tab === "signed" ? (
        <SignedDocumentPanel repositoryId={repositoryId} node={node} />
      ) : null}

      {tab === "compliance-settings" ? (
        <DocumentComplianceSettingsPanel
          repositoryId={repositoryId}
          node={node}
          canEdit={node.status !== "Archived"}
        />
      ) : null}

      <NewVersionSheet
        open={versionOpen}
        onOpenChange={setVersionOpen}
        repositoryId={repositoryId}
        node={node}
        mode="version"
      />
      <DocumentUpdateDialog
        open={updateOpen}
        onOpenChange={setUpdateOpen}
        repositoryId={repositoryId}
        node={node}
      />
      <RequestSignatureDialog
        open={signatureOpen}
        onOpenChange={setSignatureOpen}
        repositoryId={repositoryId}
        node={node}
      />
      <ShareDocumentDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        repositoryId={repositoryId}
        node={node}
      />
    </div>
  );
}
