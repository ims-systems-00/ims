import { useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { EmptyState } from "@/shared/components/empty-state";
import { Button } from "@/shared/components/ui/button";
import { PageHeader } from "@/shared/layout";
import { SearchInput } from "@/shared/components/search-input";
import { cn } from "@/shared/lib/utils";
import { FileTypeIcon } from "../components/file-type-icon";
import { usePublishedDocumentsQuery } from "../hooks/use-document-management";
import { formatDocumentDate } from "../lib/format";
import {
  DOCUMENT_PURPOSES,
  DOCUMENT_PURPOSE_LABELS,
  type DocumentPurpose,
} from "../types";

/** Purpose-filtered published documents (spec §10 insight list). */
export function DocumentPurposePage() {
  const { purpose: rawPurpose } = useParams<{ purpose: string }>();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const purpose = (DOCUMENT_PURPOSES as readonly string[]).includes(
    rawPurpose ?? ""
  )
    ? (rawPurpose as DocumentPurpose)
    : null;

  const query = usePublishedDocumentsQuery({
    page: 1,
    pageSize: 100,
    purpose: purpose ?? undefined,
    search: search.trim() || undefined,
  });

  if (!purpose) {
    return (
      <EmptyState
        title="Unknown purpose"
        description="This document purpose does not exist."
        action={
          <Button type="button" variant="outline" asChild>
            <Link to="/documents">Back to documents</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={DOCUMENT_PURPOSE_LABELS[purpose]}
        description="Published documents with this purpose across all repositories."
        actions={
          <Button type="button" variant="outline" size="sm" asChild>
            <Link to="/documents">
              <ArrowLeft className="size-3.5" />
              Back to documents
            </Link>
          </Button>
        }
      />

      <SearchInput
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search published documents…"
      />

      {query.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading documents…
        </div>
      ) : query.isError || !query.data ? (
        <EmptyState
          title="Unable to load documents"
          description="Published documents for this purpose could not be loaded."
        />
      ) : query.data.items.length === 0 ? (
        <EmptyState
          title="No published documents"
          description={`No published documents with purpose ${DOCUMENT_PURPOSE_LABELS[purpose]} were found.`}
        />
      ) : (
        <div
          className="min-h-[18rem] rounded-xl border border-border-subtle bg-muted/15 p-3 sm:p-4"
          role="list"
          aria-label={`${DOCUMENT_PURPOSE_LABELS[purpose]} documents`}
        >
          <div className="grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-x-2 gap-y-3 sm:grid-cols-[repeat(auto-fill,minmax(8rem,1fr))]">
            {query.data.items.map((node) => {
              const fileName =
                node.documentData?.storageInfo?.Name ?? node.name;
              return (
                <button
                  key={node.id}
                  type="button"
                  role="listitem"
                  title={`${node.name} · v${node.documentData?.dvID ?? "—"} · ${formatDocumentDate(node.updatedOn ?? node.createdOn)}`}
                  className={cn(
                    "group flex flex-col items-center gap-2 rounded-lg px-2 py-3 text-center outline-none transition-colors",
                    "hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring/40"
                  )}
                  onClick={() =>
                    navigate(
                      `/documents/repositories/${node.repositoryId}/nodes/${node.id}`
                    )
                  }
                >
                  <div className="relative flex size-16 items-center justify-center sm:size-[4.5rem]">
                    <FileTypeIcon
                      type="document"
                      fileName={fileName}
                      size="lg"
                      className="drop-shadow-sm"
                    />
                  </div>
                  <span className="line-clamp-2 w-full break-words px-0.5 text-[0.75rem] leading-snug font-medium text-foreground">
                    {node.name}
                  </span>
                  <span className="line-clamp-1 w-full px-0.5 font-mono text-[0.625rem] text-muted-foreground">
                    {node.reference}
                  </span>
                  <span className="text-[0.625rem] tabular-nums text-muted-foreground">
                    v{node.documentData?.dvID ?? "—"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
