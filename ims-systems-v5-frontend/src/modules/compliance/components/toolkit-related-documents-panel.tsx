import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { LayoutGrid, LayoutList, Loader2 } from "lucide-react";
import { EmptyState } from "@/shared/components/empty-state";
import { SearchInput } from "@/shared/components/search-input";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { FileTypeIcon } from "@/modules/document-management/components/file-type-icon";
import { usePublishedDocumentsQuery } from "@/modules/document-management/hooks/use-document-management";
import { formatDocumentDate } from "@/modules/document-management/lib/format";
import {
  DOCUMENT_PURPOSE_LABELS,
  DOCUMENT_PURPOSES,
  type DocumentPurpose,
  type DocumentTreeNode,
} from "@/modules/document-management/types";
import type { ComplianceToolkitName } from "../types";

type ViewMode = "list" | "grid";

type ToolkitRelatedDocumentsPanelProps = {
  toolkitName: ComplianceToolkitName;
  toolkitLabel: string;
};

function clausesForToolkit(
  node: DocumentTreeNode,
  toolkitName: string
): string[] {
  const links = node.documentData?.complianceLinks ?? [];
  return links.find((link) => link.toolkitId === toolkitName)?.clauseIds ?? [];
}

/**
 * Related Documents tab — published documents tagged for this toolkit via
 * upload (Applicable modules → Compliance) or Compliance Settings clause links.
 */
export function ToolkitRelatedDocumentsPanel({
  toolkitName,
  toolkitLabel,
}: ToolkitRelatedDocumentsPanelProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [purpose, setPurpose] = useState<DocumentPurpose | "">("");
  const [clauseFilter, setClauseFilter] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 300);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [purpose, clauseFilter, toolkitName]);

  const query = usePublishedDocumentsQuery({
    page,
    pageSize: 48,
    complianceToolkitId: toolkitName,
    purpose: purpose || undefined,
    clauseId: clauseFilter.trim() || undefined,
    search: search || undefined,
  });

  const items = query.data?.items ?? [];
  const totalPages = query.data?.totalPages ?? 1;

  const purposeOptions = useMemo(() => [...DOCUMENT_PURPOSES], []);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-border-subtle bg-card p-3">
        <p className="text-[0.8125rem] text-muted-foreground">
          Published documents for {toolkitLabel}: tagged on upload (Applicable
          modules → Compliance) or linked from Document → Compliance Settings.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <SearchInput
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search name or reference"
            containerClassName="sm:max-w-sm sm:flex-1"
          />
          <select
            className="ims-select sm:max-w-[12rem]"
            value={purpose}
            aria-label="Filter by purpose"
            onChange={(event) =>
              setPurpose(event.target.value as DocumentPurpose | "")
            }
          >
            <option value="">All purposes</option>
            {purposeOptions.map((item) => (
              <option key={item} value={item}>
                {DOCUMENT_PURPOSE_LABELS[item]}
              </option>
            ))}
          </select>
          <input
            className="ims-field sm:max-w-[9rem]"
            value={clauseFilter}
            placeholder="Clause (e.g. 4.1)"
            aria-label="Filter by clause"
            onChange={(event) => setClauseFilter(event.target.value)}
          />
          <div className="inline-flex rounded-md border border-border-subtle p-0.5 sm:ml-auto">
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
        </div>
      </div>

      {query.isLoading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading related documents…
        </div>
      ) : query.isError ? (
        <EmptyState
          title="Unable to load related documents"
          description="Published documents linked to this toolkit could not be loaded."
        />
      ) : items.length === 0 ? (
        <EmptyState
          title="No related documents"
          description={`Link a document to ${toolkitLabel} from Documents → open a file → Compliance Settings.`}
          action={
            <Button type="button" variant="outline" size="sm" asChild>
              <Link to="/documents">Go to documents</Link>
            </Button>
          }
        />
      ) : viewMode === "list" ? (
        <div className="overflow-hidden rounded-xl border border-border-subtle bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Reference</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Purpose</th>
                <th className="px-4 py-3 font-medium">Clauses</th>
                <th className="px-4 py-3 font-medium">Version</th>
                <th className="px-4 py-3 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {items.map((node) => {
                const clauses = clausesForToolkit(node, toolkitName);
                const purposeLabel = node.documentData?.purpose
                  ? DOCUMENT_PURPOSE_LABELS[node.documentData.purpose]
                  : "—";
                return (
                  <tr
                    key={node.id}
                    className="border-b border-border-subtle last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-3 font-mono text-xs">
                      {node.reference}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        className="font-medium text-foreground underline-offset-2 hover:underline"
                        to={`/documents/repositories/${node.repositoryId}/nodes/${node.id}`}
                      >
                        {node.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {purposeLabel}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {clauses.length > 0 ? clauses.join(", ") : "—"}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      v{node.documentData?.dvID ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDocumentDate(node.updatedOn ?? node.createdOn)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          className="min-h-[14rem] rounded-xl border border-border-subtle bg-muted/15 p-3 sm:p-4"
          role="list"
          aria-label="Related documents"
        >
          <div className="grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-x-2 gap-y-3">
            {items.map((node) => {
              const clauses = clausesForToolkit(node, toolkitName);
              return (
                <Link
                  key={node.id}
                  role="listitem"
                  title={node.name}
                  to={`/documents/repositories/${node.repositoryId}/nodes/${node.id}`}
                  className={cn(
                    "group flex flex-col items-center gap-2 rounded-lg px-2 py-3 text-center outline-none transition-colors",
                    "hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring/40"
                  )}
                >
                  <div className="relative flex size-16 items-center justify-center sm:size-[4.5rem]">
                    <FileTypeIcon
                      type="document"
                      fileName={
                        node.documentData?.storageInfo?.Name ?? node.name
                      }
                      size="lg"
                      className="drop-shadow-sm"
                    />
                  </div>
                  <span className="line-clamp-2 w-full break-words px-0.5 text-[0.75rem] leading-snug text-foreground group-hover:font-medium">
                    {node.name}
                  </span>
                  {clauses.length > 0 ? (
                    <span className="line-clamp-1 w-full text-[0.65rem] text-muted-foreground">
                      {clauses.join(", ")}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {query.isSuccess && totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3 text-sm">
          <p className="text-muted-foreground">
            Page {page} of {totalPages}
            {query.data?.total != null ? ` · ${query.data.total} documents` : ""}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
