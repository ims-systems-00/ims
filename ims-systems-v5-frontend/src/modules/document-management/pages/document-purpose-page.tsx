import { useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { EmptyState } from "@/shared/components/empty-state";
import { Button } from "@/shared/components/ui/button";
import { PageHeader } from "@/shared/layout";
import { SearchInput } from "@/shared/components/search-input";
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
        <div className="overflow-hidden rounded-xl border border-border-subtle bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Reference</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Version</th>
                <th className="px-4 py-3 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {query.data.items.map((node) => (
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
                  <td className="px-4 py-3 tabular-nums">
                    v{node.documentData?.dvID ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDocumentDate(node.updatedOn ?? node.createdOn)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
