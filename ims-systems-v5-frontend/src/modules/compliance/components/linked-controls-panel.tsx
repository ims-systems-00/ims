import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Loader2, Plus, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { FormField } from "@/shared/components/form-field";
import { SearchInput } from "@/shared/components/search-input";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { notify } from "@/shared/lib/toast";
import { useCatalogueControlsQuery } from "../hooks/use-compliance";
import {
  COMPLIANCE_TOOLKIT_NAMES,
  toolkitDisplayLabel,
  toolkitPath,
  type ModuleComplianceLink,
} from "../types";

type LinkedControlsPanelProps = {
  links: ModuleComplianceLink[];
  /** Persist full replacement link set. */
  onSave: (links: ModuleComplianceLink[]) => Promise<void>;
  canEdit?: boolean;
  pending?: boolean;
  /** Used in empty / lock copy, e.g. "risk". */
  entityLabel?: string;
  lockedMessage?: string;
};

/**
 * Reusable Linked controls tab for Risks, Incidents, OFI, Audits, etc.
 * Loads clauses from the global catalogue (no toolkit provisioning required).
 */
export function LinkedControlsPanel({
  links,
  onSave,
  canEdit = true,
  pending = false,
  entityLabel = "record",
  lockedMessage,
}: LinkedControlsPanelProps) {
  const [toolkitId, setToolkitId] = useState<string>("ISO 9001");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [draftClauses, setDraftClauses] = useState<string[]>([]);
  const [pendingRemove, setPendingRemove] =
    useState<ModuleComplianceLink | null>(null);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setSearch(searchInput.trim());
    }, 250);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  useEffect(() => {
    setDraftClauses([]);
    setSearchInput("");
    setSearch("");
  }, [toolkitId]);

  const catalogueQuery = useCatalogueControlsQuery(
    toolkitId || undefined,
    {
      page: 1,
      pageSize: 100,
      search: search || undefined,
    },
    canEdit
  );

  const existingForToolkit = useMemo(
    () => links.find((link) => link.toolkitId === toolkitId)?.clauseIds ?? [],
    [links, toolkitId]
  );

  function toggleDraftClause(clause: string) {
    setDraftClauses((current) =>
      current.includes(clause)
        ? current.filter((item) => item !== clause)
        : [...current, clause]
    );
  }

  async function saveLinks(
    nextLinks: ModuleComplianceLink[],
    successMessage: string
  ) {
    try {
      await onSave(nextLinks);
      notify.success(successMessage);
    } catch (error) {
      notify.fromError(error, "Unable to update linked controls");
      throw error;
    }
  }

  async function handleAdd() {
    if (!toolkitId.trim() || draftClauses.length === 0) return;

    const nextClauses = [
      ...new Set([...existingForToolkit, ...draftClauses]),
    ];
    const nextLinks = [
      ...links.filter((link) => link.toolkitId !== toolkitId),
      { toolkitId, clauseIds: nextClauses },
    ];

    await saveLinks(nextLinks, "Linked controls updated");
    setDraftClauses([]);
  }

  async function confirmRemove() {
    if (!pendingRemove) return;
    const nextLinks = links.filter(
      (link) => link.toolkitId !== pendingRemove.toolkitId
    );
    try {
      await saveLinks(nextLinks, "Linked control removed");
      setPendingRemove(null);
    } catch {
      // toast already shown
    }
  }

  const catalogueEmpty =
    catalogueQuery.isSuccess && catalogueQuery.data.total === 0;
  const showCatalogueError = catalogueQuery.isError && !catalogueQuery.isFetching;

  return (
    <section className="space-y-4">
      <div>
        <h3 className="ims-text-section border-b border-border-subtle pb-2">
          Linked controls
        </h3>
        <p className="ims-text-meta mt-2">
          Associate compliance toolkits and clauses with this {entityLabel}.
        </p>
      </div>

      {links.length === 0 ? (
        <p className="ims-text-meta">No compliance controls linked yet.</p>
      ) : (
        <ul className="space-y-2">
          {links.map((link) => (
            <li
              key={link.toolkitId}
              className="flex items-start justify-between gap-3 rounded-md border border-border px-3 py-2.5 text-sm"
            >
              <div className="min-w-0 space-y-1">
                <Link
                  to={toolkitPath(link.toolkitId)}
                  className="font-medium underline-offset-2 hover:underline"
                >
                  {toolkitDisplayLabel(link.toolkitId)}
                </Link>
                <p className="ims-text-meta break-words">
                  {link.clauseIds.length > 0
                    ? link.clauseIds.join(", ")
                    : "No clauses selected"}
                </p>
              </div>
              {canEdit ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  aria-label={`Remove ${link.toolkitId}`}
                  disabled={pending}
                  onClick={() => setPendingRemove(link)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {canEdit ? (
        <div className="space-y-3 rounded-md border border-border-subtle bg-surface-muted/30 px-3 py-3">
          <p className="text-sm font-medium">Add link</p>

          <FormField label="Toolkit" htmlFor="linked-controls-toolkit">
            <select
              id="linked-controls-toolkit"
              className="ims-select"
              value={toolkitId}
              disabled={pending}
              onChange={(event) => setToolkitId(event.target.value)}
            >
              {COMPLIANCE_TOOLKIT_NAMES.map((name) => (
                <option key={name} value={name}>
                  {toolkitDisplayLabel(name)}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            label="Clauses from catalogue"
            htmlFor="linked-controls-search"
            description="Search and select one or more clauses, then add the link."
          >
            <SearchInput
              id="linked-controls-search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search clause or title"
              disabled={pending}
            />
          </FormField>

          <div
            className="max-h-56 overflow-y-auto rounded-md border border-border bg-surface"
            role="listbox"
            aria-label="Catalogue clauses"
            aria-multiselectable="true"
          >
            {catalogueQuery.isLoading ? (
              <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading catalogue…
              </div>
            ) : null}

            {showCatalogueError ? (
              <p className="px-3 py-4 text-sm text-destructive" role="alert">
                Unable to load catalogue for {toolkitDisplayLabel(toolkitId)}.
              </p>
            ) : null}

            {catalogueEmpty ? (
              <p className="px-3 py-4 text-sm text-muted-foreground">
                {search
                  ? "No clauses match this search."
                  : "No catalogue controls found for this toolkit."}
              </p>
            ) : null}

            {catalogueQuery.isSuccess
              ? catalogueQuery.data.items.map((control) => {
                  const selected = draftClauses.includes(control.clause);
                  const alreadyLinked = existingForToolkit.includes(
                    control.clause
                  );
                  return (
                    <button
                      key={control.id}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      disabled={pending || alreadyLinked}
                      className={cn(
                        "flex w-full items-start gap-2 border-b border-border-subtle px-3 py-2.5 text-left text-sm last:border-0",
                        alreadyLinked
                          ? "cursor-default opacity-50"
                          : "hover:bg-accent/40",
                        selected ? "bg-accent/50" : "bg-transparent"
                      )}
                      onClick={() => toggleDraftClause(control.clause)}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-sm border",
                          selected || alreadyLinked
                            ? "border-foreground bg-foreground text-background"
                            : "border-border"
                        )}
                      >
                        {selected || alreadyLinked ? (
                          <Check className="size-3" />
                        ) : null}
                      </span>
                      <span className="min-w-0">
                        <span className="font-medium tabular-nums tracking-tight">
                          {control.clause}
                        </span>
                        <span className="mt-0.5 block truncate text-muted-foreground">
                          {control.title}
                        </span>
                        {alreadyLinked ? (
                          <span className="ims-text-meta">Already linked</span>
                        ) : null}
                      </span>
                    </button>
                  );
                })
              : null}
          </div>

          {draftClauses.length > 0 ? (
            <p className="ims-text-meta">
              Selected: {draftClauses.join(", ")}
            </p>
          ) : null}

          <Button
            type="button"
            size="sm"
            disabled={pending || draftClauses.length === 0}
            onClick={() => void handleAdd()}
          >
            {pending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Plus className="size-3.5" />
            )}
            Add control link
          </Button>
        </div>
      ) : (
        <p className="ims-text-meta">
          {lockedMessage ??
            `Linked controls cannot be changed for this ${entityLabel}.`}
        </p>
      )}

      <ConfirmDialog
        open={Boolean(pendingRemove)}
        onOpenChange={(open) => {
          if (!open) setPendingRemove(null);
        }}
        title="Remove linked control?"
        description={
          pendingRemove
            ? `Remove ${toolkitDisplayLabel(pendingRemove.toolkitId)} from this ${entityLabel}.`
            : `Remove this compliance link from the ${entityLabel}.`
        }
        confirmLabel="Remove"
        pending={pending}
        onConfirm={() => void confirmRemove()}
      />
    </section>
  );
}
