import { useMemo, useState } from "react";
import {
  ChevronRight,
  FileText,
  Folder,
  FolderPlus,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";
import { Link } from "react-router-dom";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { EmptyState } from "@/shared/components/empty-state";
import { EntityTableRow } from "@/shared/components/entity-table-row";
import { StatusBadge } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/toast";
import { createViewUrl } from "@/modules/files";
import {
  useDocumentRepositoryQuery,
  useNodePathQuery,
  useRepoNodesQuery,
  useSoftDeleteNodeMutation,
} from "../hooks/use-document-management";
import type { DocumentTreeNode } from "../types";
import { DOCUMENT_PURPOSE_LABELS } from "../types";
import { CreateFolderDialog } from "./create-folder-dialog";
import { UploadDocumentSheet } from "./upload-document-sheet";

type RepositoryWorkspaceProps = {
  repositoryId: string;
};

export function RepositoryWorkspace({ repositoryId }: RepositoryWorkspaceProps) {
  const [parentNodeId, setParentNodeId] = useState<string | null>(null);
  const [folderOpen, setFolderOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<DocumentTreeNode | null>(
    null
  );

  const repoQuery = useDocumentRepositoryQuery(repositoryId);
  const nodesQuery = useRepoNodesQuery(repositoryId, {
    page: 1,
    pageSize: 100,
    parentNodeId,
    sort: "name",
    sortDir: "asc",
  });
  const pathQuery = useNodePathQuery(repositoryId, parentNodeId);
  const softDeleteMutation = useSoftDeleteNodeMutation(repositoryId);

  const items = nodesQuery.data?.items ?? [];
  const path = pathQuery.data ?? [];

  const folders = useMemo(
    () => items.filter((item) => item.type === "folder"),
    [items]
  );
  const documents = useMemo(
    () => items.filter((item) => item.type === "document"),
    [items]
  );

  async function openDocument(node: DocumentTreeNode) {
    const meta = node.documentData?.storageInfo;
    if (!meta) {
      notify.error("File metadata missing for this document");
      return;
    }
    try {
      const view = await createViewUrl({
        bucket: meta.Bucket,
        key: meta.Key,
        fileName: meta.Name,
      });
      if (view.url.startsWith("memory://")) {
        notify.success(
          "View URL created (memory provider — no real file download)."
        );
        return;
      }
      window.open(view.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      notify.fromError(error, "Unable to open document");
    }
  }

  async function handleSoftDelete() {
    if (!pendingDelete) return;
    try {
      await softDeleteMutation.mutateAsync(pendingDelete.id);
      notify.success("Moved to bin");
      setPendingDelete(null);
    } catch (error) {
      notify.fromError(error, "Unable to move item to bin");
    }
  }

  if (repoQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading repository…
      </div>
    );
  }

  if (repoQuery.isError || !repoQuery.data) {
    return (
      <EmptyState
        title="Repository not found"
        description="This repository may have been deleted or removed."
        action={
          <Button asChild size="sm" variant="outline">
            <Link to="/documents">Back to Documents</Link>
          </Button>
        }
      />
    );
  }

  const repo = repoQuery.data;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border-subtle pb-4">
        <div className="min-w-0 space-y-1">
          <p className="text-[0.75rem] text-muted-foreground">
            <Link to="/documents" className="hover:text-foreground">
              Documents
            </Link>
            <span className="mx-1.5">/</span>
            <span>{repo.reference}</span>
          </p>
          <h1 className="ims-text-page-title">{repo.name}</h1>
          {repo.description ? (
            <p className="max-w-2xl text-[0.8125rem] text-muted-foreground">
              {repo.description}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setFolderOpen(true)}
          >
            <FolderPlus className="size-3.5" />
            New folder
          </Button>
          <Button type="button" size="sm" onClick={() => setUploadOpen(true)}>
            <Upload className="size-3.5" />
            Upload
          </Button>
        </div>
      </div>

      <nav
        aria-label="Folder path"
        className="flex flex-wrap items-center gap-1 text-[0.8125rem]"
      >
        <button
          type="button"
          className="rounded-sm px-1.5 py-0.5 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          onClick={() => setParentNodeId(null)}
        >
          Root
        </button>
        {path.map((item) => (
          <span key={item.nodeId} className="inline-flex items-center gap-1">
            <ChevronRight className="size-3.5 text-muted-foreground" />
            <button
              type="button"
              className="rounded-sm px-1.5 py-0.5 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              onClick={() => setParentNodeId(item.nodeId)}
            >
              {item.name}
            </button>
          </span>
        ))}
      </nav>

      {nodesQuery.isLoading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading contents…
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="This folder is empty"
          description="Create a folder or upload documents to get started."
          action={
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setFolderOpen(true)}
              >
                <FolderPlus className="size-3.5" />
                New folder
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => setUploadOpen(true)}
              >
                <Upload className="size-3.5" />
                Upload
              </Button>
            </div>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-md border border-border-subtle">
          <table className="ims-table w-full min-w-[36rem] text-left text-sm">
            <thead>
              <tr className="border-b border-border-subtle bg-muted/30 text-[0.75rem] text-muted-foreground">
                <th className="px-3 py-2.5 font-medium">Name</th>
                <th className="px-3 py-2.5 font-medium">Type</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 font-medium">Reference</th>
                <th className="px-3 py-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {folders.map((node) => (
                <EntityTableRow
                  key={node.id}
                  onOpen={() => setParentNodeId(node.id)}
                >
                  <td className="px-3 py-2.5">
                    <span className="inline-flex items-center gap-2 font-medium">
                      <Folder className="size-3.5 text-muted-foreground" />
                      {node.name}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">Folder</td>
                  <td className="px-3 py-2.5">—</td>
                  <td className="px-3 py-2.5 font-mono text-[0.75rem]">
                    {node.reference}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setPendingDelete(node)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </td>
                </EntityTableRow>
              ))}
              {documents.map((node) => (
                <EntityTableRow
                  key={node.id}
                  onOpen={() => void openDocument(node)}
                >
                  <td className="px-3 py-2.5">
                    <span className="inline-flex items-center gap-2 font-medium">
                      <FileText className="size-3.5 text-muted-foreground" />
                      {node.name}
                    </span>
                    {node.documentData?.purpose ? (
                      <div className="pl-5 text-[0.75rem] text-muted-foreground">
                        {DOCUMENT_PURPOSE_LABELS[node.documentData.purpose]}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">Document</td>
                  <td className="px-3 py-2.5">
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
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[0.75rem]">
                    {node.reference}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setPendingDelete(node)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </td>
                </EntityTableRow>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateFolderDialog
        open={folderOpen}
        onOpenChange={setFolderOpen}
        repositoryId={repositoryId}
        parentNodeId={parentNodeId}
      />
      <UploadDocumentSheet
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        repositoryId={repositoryId}
        parentNodeId={parentNodeId}
      />
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Move to recycle bin?"
        description={
          pendingDelete
            ? `"${pendingDelete.name}" will be soft-deleted from this location.`
            : "This item will be soft-deleted."
        }
        confirmLabel="Move to bin"
        pending={softDeleteMutation.isPending}
        onConfirm={() => void handleSoftDelete()}
      />
    </div>
  );
}
