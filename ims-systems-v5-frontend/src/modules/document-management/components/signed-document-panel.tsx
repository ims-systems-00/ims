import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, FileCheck, Loader2 } from "lucide-react";
import { StatusBadge } from "@/shared/components/status-badge";
import { cn } from "@/shared/lib/utils";
import type { DocumentTreeNode } from "../types";
import { useSignaturesQuery } from "../hooks/use-document-management";
import { formatDocumentDate } from "../lib/format";
import { DocumentPreviewPanel } from "./document-preview-panel";

type SignedDocumentPanelProps = {
  repositoryId: string;
  node: DocumentTreeNode;
};

/**
 * Signed document section — in-app preview of the stamped PDF copies
 * produced when invitees sign. Each signer gets their own signed copy
 * (stamped from the original); when several people have signed, pick
 * whose copy to preview. Rendering delegates to the shared File Handler
 * preview (inline signed view URL — no forced download).
 */
export function SignedDocumentPanel({
  repositoryId,
  node,
}: SignedDocumentPanelProps) {
  const signaturesQuery = useSignaturesQuery(repositoryId, node.id);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const signedCopies = useMemo(
    () =>
      (signaturesQuery.data ?? []).filter(
        (row) => row.status === "Signed" && row.signedCopy
      ),
    [signaturesQuery.data]
  );

  // Default to the most recently signed copy.
  useEffect(() => {
    if (signedCopies.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!signedCopies.some((row) => row.id === selectedId)) {
      const latest = [...signedCopies].sort((a, b) =>
        (b.signedAt ?? "").localeCompare(a.signedAt ?? "")
      )[0];
      setSelectedId(latest?.id ?? null);
    }
  }, [signedCopies, selectedId]);

  const selected =
    signedCopies.find((row) => row.id === selectedId) ?? signedCopies[0];

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <FileCheck className="size-4 text-primary" aria-hidden />
            Signed document
          </h2>
          <p className="mt-0.5 text-[0.75rem] text-muted-foreground">
            {signaturesQuery.isLoading
              ? "Loading signed copies…"
              : signedCopies.length === 0
                ? "No signed copies yet — the stamped PDF will be previewable here once someone signs."
                : `${signedCopies.length} signed cop${signedCopies.length === 1 ? "y" : "ies"} available to preview in the app.`}
          </p>
        </div>
        {selected ? (
          <StatusBadge tone="success">
            <BadgeCheck className="size-3" aria-hidden />
            Signed
          </StatusBadge>
        ) : null}
      </div>

      {signaturesQuery.isLoading ? (
        <div className="flex items-center gap-2 rounded-md border border-border-subtle bg-card px-3 py-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading…
        </div>
      ) : signedCopies.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border-subtle bg-card px-4 py-10 text-center">
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FileCheck className="size-5" aria-hidden />
          </span>
          <p className="text-sm font-medium">Nothing signed yet</p>
          <p className="max-w-sm text-[0.8125rem] leading-relaxed text-muted-foreground">
            Send this document for signature from the Request signature tab.
            Each signed, stamped PDF copy will appear here for in-app
            preview and download.
          </p>
        </div>
      ) : (
        <>
          {signedCopies.length > 1 ? (
            <div
              className="flex flex-wrap gap-1.5"
              role="tablist"
              aria-label="Signed copies"
            >
              {signedCopies.map((row) => {
                const active = selected?.id === row.id;
                return (
                  <button
                    key={row.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setSelectedId(row.id)}
                  >
                    {row.displayName}
                    {row.signedAt ? ` · ${formatDocumentDate(row.signedAt)}` : ""}
                  </button>
                );
              })}
            </div>
          ) : null}

          {selected?.signedCopy ? (
            <div className="space-y-2">
              <p className="text-[0.75rem] text-muted-foreground">
                Signed by{" "}
                <span className="font-medium text-foreground">
                  {selected.displayName}
                </span>
                {selected.signatureName
                  ? ` as ${selected.signatureName}`
                  : ""}
                {selected.jobTitle ? `, ${selected.jobTitle}` : ""}
                {selected.organisation ? ` (${selected.organisation})` : ""}
                {selected.signedAt
                  ? ` · ${formatDocumentDate(selected.signedAt)}`
                  : ""}
              </p>
              <DocumentPreviewPanel
                storageInfo={selected.signedCopy}
                title={selected.signedCopy.Name || `${node.name} (signed)`}
              />
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
