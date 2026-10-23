import { useState } from "react";
import { Loader2, PenLine } from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyState } from "@/shared/components/empty-state";
import { Button } from "@/shared/components/ui/button";
import { PageHeader } from "@/shared/layout";
import { StatusBadge } from "@/shared/components/status-badge";
import { notify } from "@/shared/lib/toast";
import { cn } from "@/shared/lib/utils";
import { useSessionSubjectId } from "@/security";
import type { DocumentSignature, SignatureStatus } from "../types";
import {
  useSignDocumentMutation,
  useSignatureRequestsQuery,
} from "../hooks/use-document-management";
import { formatDocumentDate } from "../lib/format";
import { SignDocumentDialog } from "../components/sign-document-dialog";

type FilterId = "all" | "mine" | SignatureStatus;

const FILTERS: Array<{ id: FilterId; label: string }> = [
  { id: "all", label: "All requests" },
  { id: "mine", label: "Waiting for me" },
  { id: "Pending", label: "Pending" },
  { id: "Signed", label: "Signed" },
];

function statusTone(status: SignatureStatus) {
  if (status === "Signed") return "success" as const;
  if (status === "Reviewed") return "neutral" as const;
  return "warning" as const;
}

/** Organisation-wide e-signature requests (spec §10). */
export function SignatureRequestsPage() {
  const [filter, setFilter] = useState<FilterId>("all");
  const [signing, setSigning] = useState<DocumentSignature | null>(null);
  const currentUserId = useSessionSubjectId();

  const query = useSignatureRequestsQuery({
    mine: filter === "mine" ? true : undefined,
    status:
      filter === "Pending" || filter === "Signed" ? filter : undefined,
  });
  const signMutation = useSignDocumentMutation(signing?.repositoryId ?? "");

  const rows = query.data ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Signature requests"
        description="Electronic signature requests across your organisation's documents."
      />

      <div className="flex flex-wrap gap-1" role="tablist" aria-label="Filter">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={filter === item.id}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              filter === item.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {query.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading requests…
        </div>
      ) : query.isError ? (
        <EmptyState
          title="Unable to load requests"
          description="Signature requests could not be loaded."
        />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No signature requests"
          description="Requests you send or receive will appear here."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border-subtle bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Invitee</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Requested</th>
                <th className="px-4 py-3 font-medium">Document</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isMine =
                  row.inviteeType === "user" &&
                  currentUserId !== undefined &&
                  row.userId === currentUserId;
                return (
                  <tr
                    key={row.id}
                    className="border-b border-border-subtle last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-3 font-medium">
                      {row.displayName}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {row.inviteeType === "email" ? "External" : "Internal"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={statusTone(row.status)}>
                        {row.status}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDocumentDate(row.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        className="underline-offset-2 hover:underline"
                        to={`/documents/repositories/${row.repositoryId}/nodes/${row.documentNodeId}`}
                      >
                        Open document
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {row.status !== "Signed" && isMine ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setSigning(row)}
                        >
                          <PenLine className="size-3.5" />
                          Sign
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <SignDocumentDialog
        open={signing !== null}
        onOpenChange={(open) => {
          if (!open) setSigning(null);
        }}
        documentName="this document"
        defaultName={signing?.displayName ?? ""}
        submitting={signMutation.isPending}
        onSign={async (input) => {
          if (!signing) return;
          try {
            await signMutation.mutateAsync({
              nodeId: signing.documentNodeId,
              signatureId: signing.id,
              body: input,
            });
            notify.success("Document signed — signed copy stored");
            setSigning(null);
          } catch {
            notify.error(
              "Could not sign this document. Only PDF documents can be stamped."
            );
          }
        }}
      />
    </div>
  );
}
