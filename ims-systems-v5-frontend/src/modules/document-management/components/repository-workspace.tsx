import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  Check,
  ChevronRight,
  Copy,
  Download,
  FolderInput,
  FolderPlus,
  GitBranch,
  LayoutGrid,
  LayoutList,
  Loader2,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { EmptyState } from "@/shared/components/empty-state";
import { EntityTableRow } from "@/shared/components/entity-table-row";
import {
  RowActionsMenu,
  type RowActionItem,
} from "@/shared/components/row-actions-menu";
import { StatusBadge } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import { plainTextFromPossiblyRich } from "@/shared/lib/plain-text";
import { notify } from "@/shared/lib/toast";
import { cn } from "@/shared/lib/utils";
import { useSessionSubjectId } from "@/security";
import { useUsersQuery } from "@/modules/users/hooks/use-users";
import {
  useDecideAuthorisationMutation,
  useDocumentRepositoryQuery,
  useDownloadRepoNodesZipMutation,
  useNodePathQuery,
  useRepoNodesQuery,
  useSoftDeleteNodeMutation,
} from "../hooks/use-document-management";
import {
  REPO_SORT_FIELD_LABELS,
  REPO_SORT_FIELDS,
  sortRepoNodes,
  type RepoSortDir,
  type RepoSortField,
} from "../lib/sort-nodes";
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

const SORT_STORAGE_KEY = "ims.docs.repo-sort";

function readStoredSort(): { field: RepoSortField; dir: RepoSortDir } {
  try {
    const raw = localStorage.getItem(SORT_STORAGE_KEY);
    if (!raw) return { field: "name", dir: "asc" };
    const parsed = JSON.parse(raw) as {
      field?: string;
      dir?: string;
    };
    const field = REPO_SORT_FIELDS.includes(parsed.field as RepoSortField)
      ? (parsed.field as RepoSortField)
      : "name";
    const dir = parsed.dir === "desc" ? "desc" : "asc";
    return { field, dir };
  } catch {
    return { field: "name", dir: "asc" };
  }
}

export function RepositoryWorkspace({ repositoryId }: RepositoryWorkspaceProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [parentNodeId, setParentNodeId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set());
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [sortField, setSortField] = useState<RepoSortField>(
    () => readStoredSort().field
  );
  const [sortDir, setSortDir] = useState<RepoSortDir>(
    () => readStoredSort().dir
  );
  const [folderOpen, setFolderOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("upload") !== "1") return;
    setUploadOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete("upload");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);
  const [copyOpen, setCopyOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [changeRepoOpen, setChangeRepoOpen] = useState(false);
  const [versionOpen, setVersionOpen] = useState(false);
  const [versionMode, setVersionMode] = useState<"version" | "revision">(
    "version"
  );
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
  const downloadZipMutation = useDownloadRepoNodesZipMutation(repositoryId);
  const sessionSubjectId = useSessionSubjectId();
  const usersQuery = useUsersQuery({ page: 1, pageSize: 100 });

  const items = nodesQuery.data?.items ?? [];
  const path = pathQuery.data ?? [];

  useEffect(() => {
    setCheckedIds(new Set());
  }, [parentNodeId, repositoryId]);

  useEffect(() => {
    try {
      localStorage.setItem(
        SORT_STORAGE_KEY,
        JSON.stringify({ field: sortField, dir: sortDir })
      );
    } catch {
      /* ignore quota / private mode */
    }
  }, [sortField, sortDir]);

  const sortedItems = useMemo(
    () => sortRepoNodes(items, sortField, sortDir),
    [items, sortField, sortDir]
  );
  const selected =
    sortedItems.find((item) => item.id === selectedId) ??
    items.find((item) => item.id === selectedId) ??
    null;

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
    () => sortedItems.filter((item) => item.type === "folder"),
    [sortedItems]
  );
  const documents = useMemo(
    () => sortedItems.filter((item) => item.type === "document"),
    [sortedItems]
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
      setCheckedIds((current) => {
        if (!current.has(pendingDelete.id)) return current;
        const next = new Set(current);
        next.delete(pendingDelete.id);
        return next;
      });
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
  }

  function toggleChecked(nodeId: string) {
    setCheckedIds((current) => {
      const next = new Set(current);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }

  function selectAllVisible() {
    setCheckedIds(new Set(sortedItems.map((item) => item.id)));
  }

  function clearChecked() {
    setCheckedIds(new Set());
  }

  async function handleDownloadSelected() {
    const ids = [...checkedIds];
    if (ids.length === 0) return;
    try {
      const blob = await downloadZipMutation.mutateAsync(ids);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${repoQuery.data?.name ?? "documents"}-download.zip`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      notify.success(
        ids.length === 1
          ? "Download started"
          : `Downloading ${ids.length} items`
      );
    } catch (error) {
      notify.fromError(error, "Unable to download selected items");
    }
  }

  function openFolder(node: DocumentTreeNode) {
    setParentNodeId(node.id);
    setSelectedId(null);
  }

  const allVisibleSelected =
    sortedItems.length > 0 &&
    sortedItems.every((item) => checkedIds.has(item.id));
  const someVisibleSelected =
    sortedItems.some((item) => checkedIds.has(item.id)) && !allVisibleSelected;

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
  const actionNode = selected;

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
          {plainTextFromPossiblyRich(repo.description) ? (
            <p className="max-w-2xl text-[0.8125rem] text-muted-foreground">
              {plainTextFromPossiblyRich(repo.description)}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1">
            <select
              className="h-8 rounded-md border-0 bg-transparent py-0 pl-1 pr-6 text-xs text-muted-foreground shadow-none focus-visible:ring-0"
              aria-label="Sort by"
              value={sortField}
              onChange={(event) =>
                setSortField(event.target.value as RepoSortField)
              }
            >
              {REPO_SORT_FIELDS.map((field) => (
                <option key={field} value={field}>
                  {REPO_SORT_FIELD_LABELS[field]}
                </option>
              ))}
            </select>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 w-8 px-0 text-muted-foreground"
              aria-label={
                sortDir === "asc"
                  ? "Sort descending"
                  : "Sort ascending"
              }
              title={
                sortDir === "asc"
                  ? "Sort descending"
                  : "Sort ascending"
              }
              onClick={() =>
                setSortDir((current) => (current === "asc" ? "desc" : "asc"))
              }
            >
              {sortDir === "asc" ? (
                <ArrowDownAZ className="size-3.5" />
              ) : (
                <ArrowUpAZ className="size-3.5" />
              )}
            </Button>
          </div>
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
          <Button
            type="button"
            size="sm"
            data-tour="docs.upload"
            onClick={() => setUploadOpen(true)}
          >
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

      {items.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="inline-flex items-center gap-2 text-[0.8125rem] text-muted-foreground">
            <input
              type="checkbox"
              className="size-3.5 rounded border-border-subtle"
              checked={allVisibleSelected}
              ref={(el) => {
                if (el) el.indeterminate = someVisibleSelected;
              }}
              onChange={() => {
                if (allVisibleSelected) clearChecked();
                else selectAllVisible();
              }}
              aria-label="Select all in this folder"
            />
            Select all in this folder
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {checkedIds.size > 0 ? (
              <span className="text-[0.75rem] text-muted-foreground">
                {checkedIds.size} selected
              </span>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={checkedIds.size === 0 || downloadZipMutation.isPending}
              onClick={() => void handleDownloadSelected()}
            >
              {downloadZipMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Download className="size-3.5" />
              )}
              Download
            </Button>
          </div>
        </div>
      ) : null}

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
                    <th className="w-10 px-3 py-2.5 font-medium">
                      <span className="sr-only">Select</span>
                    </th>
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
                        selectedId === node.id && "bg-muted/40",
                        checkedIds.has(node.id) && "bg-primary/5"
                      )}
                      onOpen={() => openFolder(node)}
                    >
                      <td className="px-3 py-2.5">
                        <input
                          type="checkbox"
                          className="size-3.5 rounded border-border-subtle"
                          checked={checkedIds.has(node.id)}
                          aria-label={`Select ${node.name}`}
                          onClick={(event) => event.stopPropagation()}
                          onChange={() => toggleChecked(node.id)}
                        />
                      </td>
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
                        selectedId === node.id && "bg-muted/40",
                        checkedIds.has(node.id) && "bg-primary/5"
                      )}
                      onOpen={() => {
                        selectNode(node);
                        openDocument(node);
                      }}
                    >
                      <td className="px-3 py-2.5">
                        <input
                          type="checkbox"
                          className="size-3.5 rounded border-border-subtle"
                          checked={checkedIds.has(node.id)}
                          aria-label={`Select ${node.name}`}
                          onClick={(event) => event.stopPropagation()}
                          onChange={() => toggleChecked(node.id)}
                        />
                      </td>
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
                  const checked = checkedIds.has(node.id);
                  return (
                    <div
                      key={node.id}
                      role="listitem"
                      className={cn(
                        "group relative flex flex-col items-center gap-2 rounded-lg px-2 py-3 text-center outline-none transition-colors",
                        "hover:bg-primary/10",
                        selected && "bg-primary/15 ring-1 ring-primary/30",
                        checked && !selected && "bg-primary/5 ring-1 ring-primary/20"
                      )}
                    >
                      <input
                        type="checkbox"
                        className="absolute left-2 top-2 size-3.5 rounded border-border-subtle"
                        checked={checked}
                        aria-label={`Select ${node.name}`}
                        onClick={(event) => event.stopPropagation()}
                        onChange={() => toggleChecked(node.id)}
                      />
                      <button
                        type="button"
                        title={node.name}
                        aria-pressed={selected}
                        className="flex w-full flex-col items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
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
                    </div>
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
  onSelect: () => void;
  onDelete: () => void;
  onMove: () => void;
  onChangeRepo: () => void;
  onNewVersion?: () => void;
  onRevise?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
}) {
  // Portalled Radix menu (shared RowActionsMenu) — rendered outside the
  // table's overflow container, so it is never clipped by table height,
  // and it flips above the trigger near the bottom of the viewport.
  const actions: RowActionItem[] = [
    { id: "details", label: "Details", onSelect },
    { id: "move", label: "Move…", onSelect: onMove },
    {
      id: "change-repository",
      label: "Change repository…",
      onSelect: onChangeRepo,
    },
    ...(node.type === "document" && node.status === "Published" && onNewVersion
      ? [
          {
            id: "new-version",
            label: "New version…",
            onSelect: onNewVersion,
          } satisfies RowActionItem,
        ]
      : []),
    ...(node.type === "document" && node.status === "Pending" && onRevise
      ? [
          {
            id: "revise",
            label: "Revise file…",
            onSelect: onRevise,
          } satisfies RowActionItem,
        ]
      : []),
    ...(node.type === "document" && node.status === "Pending" && onApprove
      ? [
          {
            id: "approve",
            label: "Approve",
            onSelect: onApprove,
          } satisfies RowActionItem,
        ]
      : []),
    ...(node.type === "document" && node.status === "Pending" && onReject
      ? [
          {
            id: "reject",
            label: "Reject",
            onSelect: onReject,
          } satisfies RowActionItem,
        ]
      : []),
    {
      id: "delete",
      label: "Move to bin",
      variant: "destructive",
      onSelect: onDelete,
    },
  ];

  return (
    <div
      className="inline-flex justify-end"
      // Keep the row highlighted while its menu is being used.
      onPointerDownCapture={onSelect}
    >
      <RowActionsMenu actions={actions} label={`Actions for ${node.name}`} />
    </div>
  );
}
