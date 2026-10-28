import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { FormField } from "@/shared/components/form-field";
import { SearchInput } from "@/shared/components/search-input";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { loadPublicEnv } from "@/shared/lib/env";
import { notify } from "@/shared/lib/toast";
import { useCurrentOrganisationQuery } from "@/modules/organisation/hooks/use-organisations";
import {
  COMPLIANCE_TOOLKIT_NAMES,
  isComplianceToolkitName,
  toolkitDisplayLabel,
  useCatalogueControlsQuery,
  type CatalogueControlItem,
} from "@/modules/compliance";
import {
  useApplyDocumentComplianceMutation,
  useClearDocumentComplianceMutation,
} from "../hooks/use-document-management";
import type { DocumentTreeNode } from "../types";

type DocumentComplianceSettingsPanelProps = {
  repositoryId: string;
  node: DocumentTreeNode;
  canEdit?: boolean;
};

/** Full sections (e.g. 4 / 5 / 6) — locked parents with no parent clause. */
function isFullSection(control: CatalogueControlItem): boolean {
  return control.isLocked && !control.parentClause;
}

/**
 * Document detail — Compliance Settings tab.
 * Links this document to one toolkit's sections/clauses: select+implement
 * (including children for full sections) and attach the document as evidence.
 */
export function DocumentComplianceSettingsPanel({
  repositoryId,
  node,
  canEdit = true,
}: DocumentComplianceSettingsPanelProps) {
  const links = node.documentData?.complianceLinks ?? [];
  const linkedToolkitId = links[0]?.toolkitId ?? null;
  const linkedClauseIds = useMemo(
    () => new Set(links[0]?.clauseIds ?? []),
    [links]
  );

  // Match sidebar licence gating: full catalogue in development-stub;
  // Auth0 mode shows only org-licensed toolkits.
  const isAuth0Mode =
    loadPublicEnv().VITE_SECURITY_PROVIDER === "auth0-openfga";
  const orgQuery = useCurrentOrganisationQuery(isAuth0Mode);
  const availableToolkits = useMemo(() => {
    if (!isAuth0Mode) return [...COMPLIANCE_TOOLKIT_NAMES];
    const licensed = (orgQuery.data?.licences.complianceTools ?? []).filter(
      (name): name is string => isComplianceToolkitName(name)
    );
    return licensed.length > 0 ? licensed : [...COMPLIANCE_TOOLKIT_NAMES];
  }, [isAuth0Mode, orgQuery.data?.licences.complianceTools]);

  const [toolkitId, setToolkitId] = useState(
    () => linkedToolkitId ?? availableToolkits[0] ?? "ISO 9001"
  );
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [pendingSection, setPendingSection] =
    useState<CatalogueControlItem | null>(null);

  const applyMutation = useApplyDocumentComplianceMutation(repositoryId);
  const clearMutation = useClearDocumentComplianceMutation(repositoryId);
  const pending = applyMutation.isPending || clearMutation.isPending;

  useEffect(() => {
    if (linkedToolkitId) {
      setToolkitId(linkedToolkitId);
      return;
    }
    if (!availableToolkits.includes(toolkitId) && availableToolkits[0]) {
      setToolkitId(availableToolkits[0]);
    }
  }, [linkedToolkitId, availableToolkits, toolkitId]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setSearch(searchInput.trim());
    }, 250);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  // Only one toolkit at a time; once linked, only that standard is shown.
  const toolkitOptions = useMemo(() => {
    if (linkedToolkitId) return [linkedToolkitId];
    return availableToolkits;
  }, [linkedToolkitId, availableToolkits]);

  const catalogueQuery = useCatalogueControlsQuery(
    toolkitId || undefined,
    {
      page: 1,
      pageSize: 100,
      search: search || undefined,
    },
    canEdit && Boolean(toolkitId)
  );

  async function applyClauses(
    clauseIds: string[],
    successMessage: string
  ): Promise<void> {
    try {
      await applyMutation.mutateAsync({
        nodeId: node.id,
        toolkitId,
        clauseIds,
      });
      notify.success(successMessage);
    } catch (error) {
      notify.fromError(error, "Unable to link compliance controls");
    }
  }

  async function handleControlClick(control: CatalogueControlItem) {
    if (!canEdit || pending) return;
    if (linkedClauseIds.has(control.clause)) return;

    if (isFullSection(control)) {
      setPendingSection(control);
      return;
    }

    await applyClauses(
      [control.clause],
      "Control selected and implemented."
    );
  }

  async function confirmSection() {
    if (!pendingSection) return;
    const section = pendingSection;
    setPendingSection(null);
    await applyClauses(
      [section.clause],
      `Section ${section.clause} selected and implemented.`
    );
  }

  async function handleClear() {
    try {
      await clearMutation.mutateAsync(node.id);
      notify.success("Compliance links cleared");
    } catch (error) {
      notify.fromError(error, "Unable to clear compliance links");
    }
  }

  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-border-subtle bg-muted/40 px-4 py-3.5">
        <p className="text-sm text-muted-foreground">
          Here you can link this document to multiple Sections, Clauses or
          Controls at once. This will automatically Select and Implement them,
          with the evidence being this document.
        </p>
      </div>

      {links.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-medium">Linked standard</h3>
            {canEdit ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                disabled={pending}
                onClick={() => void handleClear()}
              >
                <Trash2 className="size-3.5" />
                Clear links
              </Button>
            ) : null}
          </div>
          <ul className="space-y-2">
            {links.map((link) => (
              <li
                key={link.toolkitId}
                className="rounded-md border border-border px-3 py-2.5 text-sm"
              >
                <p className="font-medium">
                  {toolkitDisplayLabel(link.toolkitId)}
                </p>
                <p className="ims-text-meta mt-1 break-words">
                  {link.clauseIds.length > 0
                    ? link.clauseIds.join(", ")
                    : "No clauses linked"}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="ims-text-meta">
          No compliance standards linked to this document yet.
        </p>
      )}

      {canEdit ? (
        <div className="space-y-3 rounded-md border border-border-subtle bg-surface-muted/30 px-3 py-3">
          <FormField
            label="Toolkit"
            htmlFor="doc-compliance-toolkit"
            description={
              linkedToolkitId
                ? "Only the standard already linked to this document is shown."
                : isAuth0Mode
                  ? "Select one toolkit at a time. Only licensed standards for your organisation are listed."
                  : "Select one toolkit at a time. Same catalogue as Compliance in the sidebar."
            }
          >
            <select
              id="doc-compliance-toolkit"
              className="ims-select"
              value={toolkitId}
              disabled={pending || Boolean(linkedToolkitId)}
              onChange={(event) => setToolkitId(event.target.value)}
            >
              {toolkitOptions.map((name) => (
                <option key={name} value={name}>
                  {toolkitDisplayLabel(name)}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            label="Sections, clauses and controls"
            htmlFor="doc-compliance-search"
            description="Click a control to select and implement it. Clicking a full section asks for confirmation first."
          >
            <SearchInput
              id="doc-compliance-search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search clause or title"
              disabled={pending}
            />
          </FormField>

          <div
            className="max-h-80 overflow-y-auto rounded-md border border-border bg-surface"
            role="listbox"
            aria-label="Catalogue clauses"
          >
            {catalogueQuery.isLoading ? (
              <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading catalogue…
              </div>
            ) : null}

            {catalogueQuery.isError ? (
              <p className="px-3 py-4 text-sm text-destructive" role="alert">
                Unable to load catalogue for {toolkitDisplayLabel(toolkitId)}.
              </p>
            ) : null}

            {catalogueQuery.isSuccess && catalogueQuery.data.total === 0 ? (
              <p className="px-3 py-4 text-sm text-muted-foreground">
                {search
                  ? "No clauses match this search."
                  : "No catalogue controls found for this toolkit."}
              </p>
            ) : null}

            {catalogueQuery.isSuccess
              ? catalogueQuery.data.items.map((control) => {
                  const alreadyLinked = linkedClauseIds.has(control.clause);
                  const section = isFullSection(control);
                  return (
                    <button
                      key={control.id}
                      type="button"
                      role="option"
                      aria-selected={alreadyLinked}
                      disabled={pending || alreadyLinked}
                      className={cn(
                        "flex w-full items-start gap-2 border-b border-border-subtle px-3 py-2.5 text-left text-sm last:border-0",
                        alreadyLinked
                          ? "cursor-default opacity-50"
                          : "hover:bg-accent/40"
                      )}
                      onClick={() => void handleControlClick(control)}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-sm border",
                          alreadyLinked
                            ? "border-foreground bg-foreground text-background"
                            : "border-border"
                        )}
                      >
                        {alreadyLinked ? <Check className="size-3" /> : null}
                      </span>
                      <span className="min-w-0">
                        <span className="font-medium tabular-nums tracking-tight">
                          {control.clause}
                          {section ? (
                            <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                              Section
                            </span>
                          ) : null}
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
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(pendingSection)}
        onOpenChange={(open) => {
          if (!open) setPendingSection(null);
        }}
        title="Select and implement section?"
        description={
          pendingSection
            ? `Do you wish to select and implement ALL controls within ${pendingSection.clause} ${pendingSection.title}?`
            : "Select and implement all controls in this section?"
        }
        confirmLabel="Select and implement"
        cancelLabel="Cancel"
        pending={pending}
        destructive={false}
        onConfirm={() => void confirmSection()}
      />
    </section>
  );
}
