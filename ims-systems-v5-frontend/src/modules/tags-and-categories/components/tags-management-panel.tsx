import { useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { EmptyState } from "@/shared/components/empty-state";
import { FormField } from "@/shared/components/form-field";
import { SearchInput } from "@/shared/components/search-input";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import { StatusBadge } from "@/shared/components/status-badge";
import { isApiClientError } from "@/shared/lib/http/errors";
import { notify } from "@/shared/lib/toast";
import { cn } from "@/shared/lib/utils";
import {
  useCreateTagAndCategoryMutation,
  useDeleteTagAndCategoryMutation,
  useTagsAndCategoriesQuery,
  useUpdateTagAndCategoryMutation,
} from "../hooks/use-tags-and-categories";
import {
  createTagAndCategoryFormSchema,
  updateTagAndCategoryFormSchema,
} from "../schemas";
import type { TagAndCategory, TagApplicableModule } from "../types";
import {
  APPLICABLE_MODULE_LABELS,
  FRONTEND_APPLICABLE_MODULES,
} from "../types";

type PendingDelete = { id: string; label: string };

type TagsManagementPanelProps = {
  /** When set, list/create is scoped to this module (embedded Categories tab). */
  applicableModule?: TagApplicableModule;
  title?: string;
  description?: string;
  className?: string;
};

/**
 * Reusable catalogue management table + create/edit sheet.
 * Used by the standalone Tags page and module Categories tabs.
 */
export function TagsManagementPanel({
  applicableModule,
  title = "Categories",
  description,
  className,
}: TagsManagementPanelProps) {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<TagAndCategory | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(
    null
  );

  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [modules, setModules] = useState<TagApplicableModule[]>(
    applicableModule ? [applicableModule] : []
  );
  const [formError, setFormError] = useState<string | undefined>();

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 300);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  const listQuery = useTagsAndCategoriesQuery({
    page,
    pageSize: 10,
    search: search || undefined,
    applicableModule,
    sort: "createdOn",
    sortDir: "desc",
  });
  const createMutation = useCreateTagAndCategoryMutation();
  const updateMutation = useUpdateTagAndCategoryMutation();
  const deleteMutation = useDeleteTagAndCategoryMutation();

  const items = listQuery.data?.items ?? [];
  const totalPages = listQuery.data?.totalPages ?? 1;

  const moduleOptions = useMemo(
    () => [...FRONTEND_APPLICABLE_MODULES],
    []
  );

  function openCreate() {
    setEditing(null);
    setName("");
    setDesc("");
    setModules(applicableModule ? [applicableModule] : []);
    setFormError(undefined);
    setSheetOpen(true);
  }

  function openEdit(tag: TagAndCategory) {
    setEditing(tag);
    setName(tag.name);
    setDesc(tag.description);
    setModules(
      tag.applicableModules.filter((module) =>
        (FRONTEND_APPLICABLE_MODULES as readonly string[]).includes(module)
      ) as TagApplicableModule[]
    );
    setFormError(undefined);
    setSheetOpen(true);
  }

  async function handleSubmit() {
    if (editing) {
      const parsed = updateTagAndCategoryFormSchema.safeParse({
        name,
        description: desc,
      });
      if (!parsed.success) {
        setFormError(parsed.error.issues[0]?.message);
        return;
      }
      try {
        await updateMutation.mutateAsync({
          id: editing.id,
          body: {
            name: parsed.data.name,
            description: parsed.data.description,
          },
        });
        notify.success("Tag updated successfully.");
        setSheetOpen(false);
      } catch (error) {
        notify.fromError(error, "Failed to update category");
      }
      return;
    }

    const parsed = createTagAndCategoryFormSchema.safeParse({
      name,
      description: desc,
      applicableModules: modules,
    });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message);
      return;
    }
    try {
      await createMutation.mutateAsync({
        name: parsed.data.name,
        description: parsed.data.description,
        applicableModules: parsed.data.applicableModules,
      });
      notify.success("New tag added.");
      setSheetOpen(false);
    } catch (error) {
      notify.fromError(error, "Failed to add category");
    }
  }

  function toggleModule(module: TagApplicableModule) {
    if (applicableModule) return;
    setModules((current) =>
      current.includes(module)
        ? current.filter((item) => item !== module)
        : [...current, module]
    );
  }

  const pending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          {description ? (
            <p className="text-[0.75rem] text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search categories…"
            className="w-[14rem]"
          />
          <Button type="button" size="sm" onClick={openCreate}>
            <Plus className="size-3.5" aria-hidden />
            Create
          </Button>
        </div>
      </div>

      {listQuery.isLoading ? (
        <div
          className="flex items-center gap-2 py-10 text-sm text-muted-foreground"
          aria-busy="true"
        >
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Loading categories…
        </div>
      ) : null}

      {listQuery.isError ? (
        <p className="ims-alert ims-alert-error" role="alert">
          {isApiClientError(listQuery.error)
            ? listQuery.error.message
            : "Unable to load categories."}
        </p>
      ) : null}

      {!listQuery.isLoading && !listQuery.isError && items.length === 0 ? (
        <EmptyState
          title="No data found"
          description="Create a category to classify records in this area."
          icon={<Tags />}
        />
      ) : null}

      {!listQuery.isLoading && items.length > 0 ? (
        <div className="ims-table-wrap">
          <table className="ims-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Applicable modules</th>
                <th className="w-[7rem]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((tag) => (
                <tr key={tag.id}>
                  <td className="font-medium">{tag.name}</td>
                  <td className="max-w-[18rem] truncate text-muted-foreground">
                    {tag.description || "—"}
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {tag.applicableModules.length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        tag.applicableModules.map((module) => (
                          <StatusBadge key={module} tone="neutral">
                            {APPLICABLE_MODULE_LABELS[module] ?? module}
                          </StatusBadge>
                        ))
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={`Edit ${tag.name}`}
                        onClick={() => openEdit(tag)}
                      >
                        <Pencil className="size-3.5" aria-hidden />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        aria-label={`Delete ${tag.name}`}
                        onClick={() =>
                          setPendingDelete({ id: tag.id, label: tag.name })
                        }
                      >
                        <Trash2 className="size-3.5" aria-hidden />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {totalPages > 1 ? (
        <div className="ims-pagination flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Previous
          </Button>
          <span className="text-[0.75rem] text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() =>
              setPage((current) => Math.min(totalPages, current + 1))
            }
          >
            Next
          </Button>
        </div>
      ) : null}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="flex flex-col gap-0 sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editing ? "Edit category" : "Create category"}</SheetTitle>
            <SheetDescription>
              {editing
                ? "Name and description can be updated. Applicable modules stay as originally set."
                : "Define a reusable classification label for one or more modules."}
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <FormField label="Name" htmlFor="tag-name" required error={formError}>
              <input
                id="tag-name"
                className="ims-field"
                value={name}
                disabled={pending}
                onChange={(event) => setName(event.target.value)}
              />
            </FormField>
            <FormField label="Description" htmlFor="tag-desc" required>
              <Textarea
                id="tag-desc"
                rows={4}
                value={desc}
                disabled={pending}
                onChange={(event) => setDesc(event.target.value)}
              />
            </FormField>
            {!editing ? (
              <fieldset className="space-y-2">
                <legend className="ims-text-label">Applicable modules</legend>
                <div className="grid grid-cols-2 gap-2">
                  {moduleOptions.map((module) => {
                    const checked = modules.includes(module);
                    const locked =
                      Boolean(applicableModule) && module === applicableModule;
                    return (
                      <label
                        key={module}
                        className={cn(
                          "flex items-center gap-2 rounded-md border border-border-subtle px-2.5 py-2 text-[0.75rem]",
                          locked ? "bg-surface-muted" : "bg-surface"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked || locked}
                          disabled={pending || Boolean(applicableModule)}
                          onChange={() => toggleModule(module)}
                        />
                        {APPLICABLE_MODULE_LABELS[module]}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ) : (
              <div className="space-y-1.5">
                <p className="ims-text-label">Applicable modules</p>
                <div className="flex flex-wrap gap-1">
                  {editing.applicableModules.map((module) => (
                    <StatusBadge key={module} tone="neutral">
                      {APPLICABLE_MODULE_LABELS[module] ?? module}
                    </StatusBadge>
                  ))}
                </div>
                <p className="ims-text-meta">
                  Modules cannot be changed after create.
                </p>
              </div>
            )}
          </div>
          <SheetFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setSheetOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={pending}
              onClick={() => void handleSubmit()}
            >
              {pending ? "Saving…" : editing ? "Update" : "Add"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={pendingDelete != null}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) setPendingDelete(null);
        }}
        title="This tag will be deleted"
        description={
          pendingDelete
            ? `Permanently remove “${pendingDelete.label}”. Linked records keep the stored id.`
            : ""
        }
        pending={deleteMutation.isPending}
        onConfirm={async () => {
          if (!pendingDelete) return;
          try {
            await deleteMutation.mutateAsync(pendingDelete.id);
            notify.success("Tag deleted successfully");
            setPendingDelete(null);
          } catch (error) {
            notify.fromError(error, "Failed to delete category");
          }
        }}
      />
    </div>
  );
}
