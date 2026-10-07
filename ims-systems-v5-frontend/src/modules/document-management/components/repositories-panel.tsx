import { useEffect, useState } from "react";
import { Loader2, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { EmptyState } from "@/shared/components/empty-state";
import { EntityTableRow } from "@/shared/components/entity-table-row";
import { SearchInput } from "@/shared/components/search-input";
import { StatusBadge } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/toast";
import {
  useDocumentRepositoriesQuery,
  useHardDeleteDocumentRepositoryMutation,
  useRestoreDocumentRepositoryMutation,
  useSoftDeleteDocumentRepositoryMutation,
} from "../hooks/use-document-management";
import { useDocumentsUiStore } from "../store/use-documents-ui-store";
import type { DocumentRepository } from "../types";
import { RepositoryFormSheet } from "./repository-form-sheet";

type RepositoriesPanelProps = {
  deleted?: boolean;
};

export function RepositoriesPanel({ deleted = false }: RepositoriesPanelProps) {
  const navigate = useNavigate();
  const createRepoOpen = useDocumentsUiStore((s) => s.createRepoOpen);
  const setCreateRepoOpen = useDocumentsUiStore((s) => s.setCreateRepoOpen);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pendingSoft, setPendingSoft] = useState<DocumentRepository | null>(
    null
  );
  const [pendingHard, setPendingHard] = useState<DocumentRepository | null>(
    null
  );

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 300);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  const listQuery = useDocumentRepositoriesQuery({
    page,
    pageSize: 10,
    search: search || undefined,
    deleted,
    sort: "createdOn",
    sortDir: "desc",
  });
  const softDeleteMutation = useSoftDeleteDocumentRepositoryMutation();
  const restoreMutation = useRestoreDocumentRepositoryMutation();
  const hardDeleteMutation = useHardDeleteDocumentRepositoryMutation();

  const items = listQuery.data?.items ?? [];
  const totalPages = listQuery.data?.totalPages ?? 1;

  async function handleSoftDelete() {
    if (!pendingSoft) return;
    try {
      await softDeleteMutation.mutateAsync(pendingSoft.id);
      notify.success("Repository moved to bin");
      setPendingSoft(null);
    } catch (error) {
      notify.fromError(error, "Unable to move repository to bin");
    }
  }

  async function handleRestore(repo: DocumentRepository) {
    try {
      await restoreMutation.mutateAsync(repo.id);
      notify.success("Repository restored");
    } catch (error) {
      notify.fromError(error, "Unable to restore repository");
    }
  }

  async function handleHardDelete() {
    if (!pendingHard) return;
    try {
      await hardDeleteMutation.mutateAsync(pendingHard.id);
      notify.success("Repository permanently deleted");
      setPendingHard(null);
    } catch (error) {
      notify.fromError(error, "Unable to delete repository");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            {deleted ? "Recycle Bin" : "Repositories"}
          </h2>
          <p className="text-[0.75rem] text-muted-foreground">
            {deleted
              ? "Restore or permanently delete soft-deleted libraries."
              : "Controlled document libraries for your organisation."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search repositories…"
            className="w-[14rem]"
          />
          {!deleted ? (
            <Button
              type="button"
              size="sm"
              onClick={() => setCreateRepoOpen(true)}
            >
              <Plus className="size-3.5" />
              Create
            </Button>
          ) : null}
        </div>
      </div>

      {listQuery.isLoading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading repositories…
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title={deleted ? "Recycle bin is empty" : "No repositories yet"}
          description={
            deleted
              ? "Soft-deleted repositories will appear here."
              : "Create a repository to start organising controlled documents."
          }
          action={
            deleted ? undefined : (
              <Button
                type="button"
                size="sm"
                onClick={() => setCreateRepoOpen(true)}
              >
                <Plus className="size-3.5" />
                Create repository
              </Button>
            )
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-md border border-border-subtle">
          <table className="ims-table w-full min-w-[40rem] text-left text-sm">
            <thead>
              <tr className="border-b border-border-subtle bg-muted/30 text-[0.75rem] text-muted-foreground">
                <th className="px-3 py-2.5 font-medium">Reference</th>
                <th className="px-3 py-2.5 font-medium">Name</th>
                <th className="px-3 py-2.5 font-medium">Privacy</th>
                <th className="px-3 py-2.5 font-medium">Review</th>
                <th className="px-3 py-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((repo) => (
                <EntityTableRow
                  key={repo.id}
                  onOpen={
                    deleted
                      ? undefined
                      : () => navigate(`/documents/repositories/${repo.id}`)
                  }
                >
                  <td className="px-3 py-2.5 font-mono text-[0.75rem]">
                    {repo.reference}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-foreground">{repo.name}</div>
                    {repo.description ? (
                      <div className="line-clamp-1 text-[0.75rem] text-muted-foreground">
                        {repo.description}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusBadge tone="neutral">{repo.privacy}</StatusBadge>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {repo.reviewInterval}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex justify-end gap-1">
                      {deleted ? (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => void handleRestore(repo)}
                            disabled={restoreMutation.isPending}
                          >
                            <RotateCcw className="size-3.5" />
                            Restore
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setPendingHard(repo)}
                          >
                            <Trash2 className="size-3.5" />
                            Delete
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setPendingSoft(repo)}
                        >
                          <Trash2 className="size-3.5" />
                          Bin
                        </Button>
                      )}
                    </div>
                  </td>
                </EntityTableRow>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-[0.75rem] text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}

      <RepositoryFormSheet
        open={createRepoOpen}
        onOpenChange={setCreateRepoOpen}
      />

      <ConfirmDialog
        open={Boolean(pendingSoft)}
        onOpenChange={(open) => {
          if (!open) setPendingSoft(null);
        }}
        title="Move repository to bin?"
        description={
          pendingSoft
            ? `"${pendingSoft.name}" and its contents will be soft-deleted.`
            : "This repository will be soft-deleted."
        }
        confirmLabel="Move to bin"
        pending={softDeleteMutation.isPending}
        onConfirm={() => void handleSoftDelete()}
      />

      <ConfirmDialog
        open={Boolean(pendingHard)}
        onOpenChange={(open) => {
          if (!open) setPendingHard(null);
        }}
        title="Permanently delete repository?"
        description={
          pendingHard
            ? `"${pendingHard.name}" and stored files will be removed. This cannot be undone.`
            : "This repository will be permanently deleted."
        }
        confirmLabel="Delete permanently"
        pending={hardDeleteMutation.isPending}
        onConfirm={() => void handleHardDelete()}
      />
    </div>
  );
}
