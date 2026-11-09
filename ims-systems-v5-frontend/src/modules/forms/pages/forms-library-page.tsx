import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ClipboardList,
  LayoutGrid,
  List,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { EmptyState } from "@/shared/components/empty-state";
import { SearchInput } from "@/shared/components/search-input";
import { PageHeader } from "@/shared/layout";
import { StatusBadge } from "@/shared/components/status-badge";
import { isApiClientError } from "@/shared/lib/http/errors";
import { notify } from "@/shared/lib/toast";
import {
  useCreateFormMutation,
  useFormsQuery,
  useSoftDeleteFormMutation,
} from "../hooks/use-forms";
import type { FormStatus } from "../types";

type ViewMode = "grid" | "table";

function statusTone(status: FormStatus) {
  if (status === "published") return "success" as const;
  if (status === "archived") return "neutral" as const;
  return "warning" as const;
}

export function FormsLibraryPage() {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<FormStatus | "">("");
  const [view, setView] = useState<ViewMode>("grid");
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 300);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  const params = useMemo(
    () => ({
      page,
      pageSize: 12,
      search: search || undefined,
      status: status || undefined,
      sort: "updatedAt" as const,
      sortDir: "desc" as const,
    }),
    [page, search, status]
  );

  const query = useFormsQuery(params);
  const createMutation = useCreateFormMutation();
  const deleteMutation = useSoftDeleteFormMutation();

  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const pageSize = query.data?.pageSize ?? 12;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  async function handleCreate() {
    if (!newTitle.trim()) {
      notify.error("Title is required");
      return;
    }
    try {
      const result = await createMutation.mutateAsync({
        title: newTitle.trim(),
        description: newDescription.trim() || null,
      });
      notify.success("Form created");
      setCreateOpen(false);
      setNewTitle("");
      setNewDescription("");
      navigate(`/documents/forms/${result.form.id}/build-form`);
    } catch (error) {
      notify.error(
        isApiClientError(error)
          ? error.message
          : "Could not create form. Check the IMS Forms licence."
      );
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    try {
      await deleteMutation.mutateAsync(pendingDelete.id);
      notify.success("Form moved to trash");
      setPendingDelete(null);
    } catch (error) {
      notify.error(
        isApiClientError(error) ? error.message : "Could not delete form"
      );
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Forms"
        description="Create and manage reusable organisation forms under Documents."
        actions={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            New form
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search forms…"
          containerClassName="max-w-xs"
        />
        <select
          className="h-9 rounded-md border border-border bg-background px-2 text-sm"
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value as FormStatus | "");
          }}
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
        <div className="ml-auto flex gap-1">
          <Button
            type="button"
            variant={view === "grid" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("grid")}
            aria-label="Grid view"
          >
            <LayoutGrid className="size-4" />
          </Button>
          <Button
            type="button"
            variant={view === "table" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("table")}
            aria-label="Table view"
          >
            <List className="size-4" />
          </Button>
        </div>
      </div>

      {query.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading forms…
        </div>
      ) : query.isError ? (
        <EmptyState
          icon={<ClipboardList />}
          title="Forms unavailable"
          description="IMS Forms may be disabled for this organisation, or you lack permission."
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<ClipboardList />}
          title="No forms yet"
          description="Create a form to start building with drag-and-drop elements."
          action={
            <Button type="button" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              New form
            </Button>
          }
        />
      ) : view === "grid" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((form) => (
            <Link
              key={form.id}
              to={`/documents/forms/${form.id}/build-form`}
              className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-medium leading-snug">{form.title}</h3>
                <StatusBadge tone={statusTone(form.status)}>
                  {form.status}
                </StatusBadge>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                {form.description || "No description"}
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                {form.submissionCount} submission
                {form.submissionCount === 1 ? "" : "s"}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Title</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Submissions</th>
                <th className="px-3 py-2 font-medium">Updated</th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {items.map((form) => (
                <tr key={form.id} className="border-t border-border">
                  <td className="px-3 py-2">
                    <Link
                      to={`/documents/forms/${form.id}/build-form`}
                      className="font-medium text-primary hover:underline"
                    >
                      {form.title}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge tone={statusTone(form.status)}>
                      {form.status}
                    </StatusBadge>
                  </td>
                  <td className="px-3 py-2">{form.submissionCount}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {new Date(form.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setPendingDelete({ id: form.id, title: form.title })
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-end gap-2 text-sm">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}

      {createOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-background p-5 shadow-lg">
            <h2 className="text-lg font-semibold">Create form</h2>
            <label className="mt-4 block text-sm font-medium">
              Title
              <input
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                autoFocus
              />
            </label>
            <label className="mt-3 block text-sm font-medium">
              Description
              <textarea
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                rows={3}
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={createMutation.isPending}
                onClick={() => void handleCreate()}
              >
                {createMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                Create
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Move form to trash?"
        description={
          pendingDelete
            ? `"${pendingDelete.title}" will be soft-deleted.`
            : "This form will be soft-deleted."
        }
        confirmLabel="Delete"
        pending={deleteMutation.isPending}
        onConfirm={() => void handleDelete()}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      />
    </div>
  );
}
