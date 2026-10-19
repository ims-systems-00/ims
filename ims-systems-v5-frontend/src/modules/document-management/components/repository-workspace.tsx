import { useMemo, useState } from "react";
import {
  Check,
  ChevronRight,
  Copy,
  FolderInput,
  FolderPlus,
  GitBranch,
  LayoutGrid,
  LayoutList,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { EmptyState } from "@/shared/components/empty-state";
import { EntityTableRow } from "@/shared/components/entity-table-row";
import { StatusBadge } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/toast";
import { cn } from "@/shared/lib/utils";
import { useSessionSubjectId } from "@/security";
import { useUsersQuery } from "@/modules/users/hooks/use-users";
import {
  useDecideAuthorisationMutation,
  useDocumentRepositoryQuery,
  useNodePathQuery,
  useRepoNodesQuery,
  useSoftDeleteNodeMutation,
} from "../hooks/use-document-management";
import type { DocumentTreeNode } from "../types";
import { DOCUMENT_PURPOSE_LABELS } from "../types";
import { ChangeRepositoryDialog } from "./change-repository-dialog";
import { CopyFolderStructureDialog } from "./copy-folder-structure-dialog";
import { CreateFolderDialog } from "./create-folder-dialog";
import { FileTypeIcon } from "./file-type-icon";
import { MoveNodeDialog } from "./move-node-dialog";
import { NewVersionSheet } from "./new-version-sheet";
import { RepositoryDetailsPanel } from "./repository-details-panel";
import { UploadDocumentSheet } from "./upload-document-sheet";

type RepositoryWorkspaceProps = {
  repositoryId: string;
};

type ViewMode = "list" | "grid";

export function RepositoryWorkspace({ repositoryId }: RepositoryWorkspaceProps) {
  const navigate = useNavigate();
  const [parentNodeId, setParentNodeId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [folderOpen, setFolderOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [changeRepoOpen, setChangeRepoOpen] = useState(false);
  const [versionOpen, setVersionOpen] = useState(false);
  const [versionMode, setVersionMode] = useState<"version" | "revision">(
    "version"
  );
  const [menuNodeId, setMenuNodeId] = useState<string | null>(null);
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
  const decideMutation = useDecideAuthorisationMutation(repositoryId);
  const sessionSubjectId = useSessionSubjectId();
  const usersQuery = useUsersQuery({ page: 1, pageSize: 100 });

  const items = nodesQuery.data?.items ?? [];
  const path = pathQuery.data ?? [];
  const selected = items.find((item) => item.id === selectedId) ?? null;

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

  const folders = useMemo(
    () => items.filter((item) => item.type === "folder"),
    [items]
  );
  const documents = useMemo(
    () => items.filter((item) => item.type === "document"),
    [items]
  );

  function openDocument(node: DocumentTreeNode) {
    if (node.type !== "document") return;
    navigate(
      `/documents/repositories/${repositoryId}/nodes/${node.id}`
    );
  }

  async function handleSoftDelete() {
    if (!pendingDelete) return;
    try {
      await softDeleteMutation.mutateAsync(pendingDelete.id);
      notify.success("Moved to bin");
      if (selectedId === pendingDelete.id) setSelectedId(null);
      setPendingDelete(null);
    } catch (error) {
      notify.fromError(error, "Unable to move item to bin");
    }
  }

  async function handleDecide(
    node: DocumentTreeNode,
    status: "Approved" | "Rejected"
  ) {
    try {
      const entry = node.documentData?.authorisation.find(
        (item) =>
          item.status === "Pending" &&
          sessionSubjectId != null &&
          item.userId === sessionSubjectId
      );
      if (!entry) {
        notify.error("No pending authorisation assigned to you on this document");
        return;
      }
      await decideMutation.mutateAsync({
        nodeId: node.id,
        authorisationId: entry.id,
        status,
      });
      notify.success(status === "Approved" ? "Approved" : "Rejected");
    } catch (error) {
      notify.fromError(error, "Unable to update authorisation");
    }
  }

  function selectNode(node: DocumentTreeNode) {
    setSelectedId(node.id);
    setMenuNodeId(null);
  }

  function openFolder(node: DocumentTreeNode) {
    setParentNodeId(node.id);
    setSelectedId(null);
    setMenuNodeId(null);
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
  const actionNode =
    items.find((item) => item.id === menuNodeId) ??
    (selectedId ? items.find((item) => item.id === selectedId) : null) ??
    null;

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
          <div className="inline-flex rounded-md border border-border-subtle p-0.5">
            <Button
              type="button"
              size="sm"
              variant={viewMode === "list" ? "secondary" : "ghost"}
              aria-pressed={viewMode === "list"}
              aria-label="List view"
              onClick={() => setViewMode("list")}
            >
              <LayoutList className="size-3.5" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              aria-pressed={viewMode === "grid"}
              aria-label="Grid view"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="size-3.5" />
            </Button>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setCopyOpen(true)}
          >
            <Copy className="size-3.5" />
            Copy folders
          </Button>
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
          onClick={() => {
            setParentNodeId(null);
            setSelectedId(null);
          }}
        >
          Root
        </button>
        {path.map((item) => (
          <span key={item.nodeId} className="inline-flex items-center gap-1">
            <ChevronRight className="size-3.5 text-muted-foreground" />
            <button
              type="button"
              className="rounded-sm px-1.5 py-0.5 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              onClick={() => {
                setParentNodeId(item.nodeId);
                setSelectedId(null);
              }}
            >
              {item.name}
            </button>
          </span>
        ))}
      </nav>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-3">
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
          ) : viewMode === "list" ? (
            <div className="overflow-x-auto rounded-md border border-border-subtle">
              <table className="ims-table w-full min-w-[36rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-border-subtle bg-muted/30 text-[0.75rem] text-muted-foreground">
                    <th className="px-3 py-2.5 font-medium">Name</th>
                    <th className="px-3 py-2.5 font-medium">Type</th>
                    <th className="px-3 py-2.5 font-medium">Status</th>
                    <th className="px-3 py-2.5 font-medium">Reference</th>
                    <th className="px-3 py-2.5 font-medium text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {folders.map((node) => (
                    <EntityTableRow
                      key={node.id}
                      className={cn(
                        selectedId === node.id && "bg-muted/40"
                      )}
                      onOpen={() => openFolder(node)}
                    >
                      <td className="px-3 py-2.5">
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 font-medium"
                          onClick={(event) => {
                            event.stopPropagation();
                            selectNode(node);
                          }}
                        >
                          <FileTypeIcon
                            type="folder"
                            size="sm"
                          />
                          {node.name}
                        </button>
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        Folder
                      </td>
                      <td className="px-3 py-2.5">—</td>
                      <td className="px-3 py-2.5 font-mono text-[0.75rem]">
                        {node.reference}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <NodeActions
                          node={node}
                          open={menuNodeId === node.id}
                          onOpenChange={(open) =>
                            setMenuNodeId(open ? node.id : null)
                          }
                          onSelect={() => selectNode(node)}
                          onDelete={() => setPendingDelete(node)}
                          onMove={() => {
                            selectNode(node);
                            setMoveOpen(true);
                          }}
                          onChangeRepo={() => {
                            selectNode(node);
                            setChangeRepoOpen(true);
                          }}
                        />
                      </td>
                    </EntityTableRow>
                  ))}
                  {documents.map((node) => (
                    <EntityTableRow
                      key={node.id}
                      className={cn(
                        selectedId === node.id && "bg-muted/40"
                      )}
                      onOpen={() => {
                        selectNode(node);
                        openDocument(node);
                      }}
                    >
                      <td className="px-3 py-2.5">
                        <button
                          type="button"
                          className="text-left"
                          onClick={(event) => {
                            event.stopPropagation();
                            selectNode(node);
                          }}
                        >
                          <span className="inline-flex items-center gap-2 font-medium">
                            <FileTypeIcon
                              type="document"
                              fileName={
                                node.documentData?.storageInfo?.Name ??
                                node.name
                              }
                              size="sm"
                            />
                            {node.name}
                          </span>
                          {node.documentData?.purpose ? (
                            <div className="pl-6 text-[0.75rem] text-muted-foreground">
                              {
                                DOCUMENT_PURPOSE_LABELS[
                                  node.documentData.purpose
                                ]
                              }
                            </div>
                          ) : null}
                        </button>
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        Document
                      </td>
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
                        <NodeActions
                          node={node}
                          open={menuNodeId === node.id}
                          onOpenChange={(open) =>
                            setMenuNodeId(open ? node.id : null)
                          }
                          onSelect={() => selectNode(node)}
                          onDelete={() => setPendingDelete(node)}
                          onMove={() => {
                            selectNode(node);
                            setMoveOpen(true);
                          }}
                          onChangeRepo={() => {
                            selectNode(node);
                            setChangeRepoOpen(true);
                          }}
                          onNewVersion={() => {
                            selectNode(node);
                            setVersionMode("version");
                            setVersionOpen(true);
                          }}
                          onRevise={() => {
                            selectNode(node);
                            setVersionMode("revision");
                            setVersionOpen(true);
                          }}
                          onApprove={() => void handleDecide(node, "Approved")}
                          onReject={() => void handleDecide(node, "Rejected")}
                        />
                      </td>
                    </EntityTableRow>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div
              className="min-h-[18rem] rounded-xl border border-border-subtle bg-muted/15 p-3 sm:p-4"
              role="list"
              aria-label="Repository contents"
              onClick={() => setSelectedId(null)}
            >
              <div className="grid grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] gap-x-2 gap-y-3 sm:grid-cols-[repeat(auto-fill,minmax(7rem,1fr))]">
                {[...folders, ...documents].map((node) => {
                  const selected = selectedId === node.id;
                  return (
                    <button
                      key={node.id}
                      type="button"
                      role="listitem"
                      title={node.name}
                      aria-pressed={selected}
                      className={cn(
                        "group relative flex flex-col items-center gap-2 rounded-lg px-2 py-3 text-center outline-none transition-colors",
                        "hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring/40",
                        selected && "bg-primary/15 ring-1 ring-primary/30"
                      )}
                      onClick={(event) => {
                        event.stopPropagation();
                        selectNode(node);
                      }}
                      onDoubleClick={(event) => {
                        event.stopPropagation();
                        if (node.type === "folder") openFolder(node);
                        else openDocument(node);
                      }}
                    >
                      <div className="relative flex size-16 items-center justify-center sm:size-[4.5rem]">
                        <FileTypeIcon
                          type={node.type}
                          fileName={
                            node.documentData?.storageInfo?.Name ?? node.name
                          }
                          size="lg"
                          className="drop-shadow-sm"
                        />
                        {node.type === "document" &&
                        node.status !== "Published" ? (
                          <span className="absolute -right-1 -top-1">
                            <StatusBadge
                              tone={
                                node.status === "Pending"
                                  ? "warning"
                                  : node.status === "Rejected"
                                    ? "destructive"
                                    : "neutral"
                              }
                            >
                              {node.status}
                            </StatusBadge>
                          </span>
                        ) : null}
                      </div>
                      <span
                        className={cn(
                          "line-clamp-2 w-full break-words px-0.5 text-[0.75rem] leading-snug text-foreground",
                          selected && "font-medium"
                        )}
                      >
                        {node.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {viewMode === "grid" && selected && selected.type === "document" ? (
            <div className="flex flex-wrap gap-2 rounded-md border border-border-subtle p-3">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => openDocument(selected)}
              >
                Open
              </Button>
              {selected.status === "Published" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setVersionMode("version");
                    setVersionOpen(true);
                  }}
                >
                  <GitBranch className="size-3.5" />
                  New version
                </Button>
              ) : null}
              {selected.status === "Pending" ? (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setVersionMode("revision");
                      setVersionOpen(true);
                    }}
                  >
                    <RefreshCw className="size-3.5" />
                    Revise
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void handleDecide(selected, "Approved")}
                  >
                    <Check className="size-3.5" />
                    Approve
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void handleDecide(selected, "Rejected")}
                  >
                    <X className="size-3.5" />
                    Reject
                  </Button>
                </>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setMoveOpen(true)}
              >
                <FolderInput className="size-3.5" />
                Move
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setPendingDelete(selected)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ) : null}
        </div>

        <RepositoryDetailsPanel
          repository={repo}
          selected={selected}
          userNames={userNames}
        />
      </div>

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
      <CopyFolderStructureDialog
        open={copyOpen}
        onOpenChange={setCopyOpen}
        repositoryId={repositoryId}
      />
      <MoveNodeDialog
        open={moveOpen}
        onOpenChange={setMoveOpen}
        repositoryId={repositoryId}
        node={actionNode}
      />
      <ChangeRepositoryDialog
        open={changeRepoOpen}
        onOpenChange={setChangeRepoOpen}
        repositoryId={repositoryId}
        node={actionNode}
      />
      <NewVersionSheet
        open={versionOpen}
        onOpenChange={setVersionOpen}
        repositoryId={repositoryId}
        node={actionNode}
        mode={versionMode}
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

function NodeActions({
  node,
  open,
  onOpenChange,
  onSelect,
  onDelete,
  onMove,
  onChangeRepo,
  onNewVersion,
  onRevise,
  onApprove,
  onReject,
}: {
  node: DocumentTreeNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: () => void;
  onDelete: () => void;
  onMove: () => void;
  onChangeRepo: () => void;
  onNewVersion?: () => void;
  onRevise?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
}) {
  return (
    <div className="relative inline-flex justify-end">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        aria-label="More actions"
        onClick={(event) => {
          event.stopPropagation();
          onSelect();
          onOpenChange(!open);
        }}
      >
        <MoreHorizontal className="size-3.5" />
      </Button>
      {open ? (
        <div className="absolute right-0 top-full z-20 mt-1 min-w-[11rem] rounded-md border border-border-subtle bg-card py-1 shadow-md">
          <ActionItem label="Details" onClick={onSelect} />
          <ActionItem label="Move…" onClick={onMove} />
          <ActionItem label="Change repository…" onClick={onChangeRepo} />
          {node.type === "document" && node.status === "Published" && onNewVersion ? (
            <ActionItem label="New version…" onClick={onNewVersion} />
          ) : null}
          {node.type === "document" && node.status === "Pending" && onRevise ? (
            <ActionItem label="Revise file…" onClick={onRevise} />
          ) : null}
          {node.type === "document" && node.status === "Pending" && onApprove ? (
            <ActionItem label="Approve" onClick={onApprove} />
          ) : null}
          {node.type === "document" && node.status === "Pending" && onReject ? (
            <ActionItem label="Reject" onClick={onReject} />
          ) : null}
          <ActionItem label="Move to bin" onClick={onDelete} danger />
        </div>
      ) : null}
    </div>
  );
}

function ActionItem({
  label,
  onClick,
  danger,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      className={cn(
        "block w-full px-3 py-1.5 text-left text-[0.8125rem] hover:bg-muted/50",
        danger && "text-destructive"
      )}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      {label}
    </button>
  );
}
