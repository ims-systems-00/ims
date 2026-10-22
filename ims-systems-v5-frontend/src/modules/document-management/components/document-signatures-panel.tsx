import { useState } from "react";
import {
  Download,
  Eye,
  Loader2,
  PenLine,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { StatusBadge } from "@/shared/components/status-badge";
import { notify } from "@/shared/lib/toast";
import { downloadFile, FilePreviewModal } from "@/modules/files";
import type { DocumentFileMeta } from "../types";
import { useSessionSubjectId } from "@/security";
import type { DocumentSignature, DocumentTreeNode } from "../types";
import {
  useRemoveSignatureMutation,
  useResendSignatureMutation,
  useSignDocumentMutation,
  useSignaturesQuery,
} from "../hooks/use-document-management";
import { formatDocumentDate } from "../lib/format";
import { SignDocumentDialog } from "./sign-document-dialog";

type DocumentSignaturesPanelProps = {
  repositoryId: string;
  node: DocumentTreeNode;
  onRequestSignature: () => void;
};

function statusTone(status: DocumentSignature["status"]) {
  if (status === "Signed") return "success" as const;
  if (status === "Reviewed") return "neutral" as const;
  return "warning" as const;
}

/**
 * Signature requests for one document — backed by the e-signature API.
 * Internal invitees sign in-app; signing stamps a signed PDF copy and
 * recomputes document conformance on the backend.
 */
export function DocumentSignaturesPanel({
  repositoryId,
  node,
  onRequestSignature,
}: DocumentSignaturesPanelProps) {
  const signaturesQuery = useSignaturesQuery(repositoryId, node.id);
  const resendMutation = useResendSignatureMutation(repositoryId);
  const removeMutation = useRemoveSignatureMutation(repositoryId);
  const signMutation = useSignDocumentMutation(repositoryId);
  const currentUserId = useSessionSubjectId();
  const [signing, setSigning] = useState<DocumentSignature | null>(null);
  const [previewFile, setPreviewFile] = useState<DocumentFileMeta | null>(
    null
  );

  const signatures = signaturesQuery.data ?? [];
  const signedCount = signatures.filter((row) => row.status === "Signed").length;

  return (
    <div className="rounded-xl border border-border-subtle bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">
            Signature requests
          </h2>
          <p className="text-[0.75rem] text-muted-foreground">
            {signaturesQuery.isLoading
              ? "Loading signature requests…"
              : signatures.length === 0
                ? "No requests yet — invite people to sign this document."
                : `${signedCount} of ${signatures.length} signed`}
          </p>
        </div>
        <Button type="button" size="sm" onClick={onRequestSignature}>
          <PenLine className="size-3.5" />
          Request signature
        </Button>
      </div>

      {signaturesQuery.isLoading ? (
        <div className="flex items-center gap-2 pt-4 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading…
        </div>
      ) : signatures.length > 0 ? (
        <ul className="space-y-2 pt-4">
          {signatures.map((row) => {
            const isMine =
              row.inviteeType === "user" &&
              currentUserId !== undefined &&
              row.userId === currentUserId;
            return (
              <li
                key={row.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-border-subtle px-3 py-2.5"
              >
                <div className="min-w-0 space-y-1">
                  <p className="truncate text-sm font-medium">
                    {row.displayName}
                  </p>
                  <p className="text-[0.6875rem] text-muted-foreground">
                    {row.inviteeType === "email" ? "External" : "Internal"} ·{" "}
                    {formatDocumentDate(row.createdAt)}
                    {row.signedAt
                      ? ` · Signed ${formatDocumentDate(row.signedAt)}`
                      : row.lastOpenedAt
                        ? ` · Opened ${formatDocumentDate(row.lastOpenedAt)}`
                        : ""}
                  </p>
                  <StatusBadge tone={statusTone(row.status)}>
                    {row.status}
                  </StatusBadge>
                  {row.status === "Signed" && row.signatureName ? (
                    <p className="text-[0.6875rem] text-muted-foreground">
                      Signed as {row.signatureName}
                      {row.jobTitle ? `, ${row.jobTitle}` : ""}
                      {row.organisation ? ` (${row.organisation})` : ""}
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 flex-wrap gap-1">
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
                  {row.status !== "Signed" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={resendMutation.isPending}
                      onClick={() =>
                        resendMutation.mutate(
                          { nodeId: node.id, signatureId: row.id },
                          {
                            onSuccess: () =>
                              notify.success("Signature request resent"),
                            onError: () =>
                              notify.error("Could not resend the request"),
                          }
                        )
                      }
                    >
                      <RefreshCw className="size-3.5" />
                      Resend
                    </Button>
                  ) : null}
                  {row.signedCopy ? (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setPreviewFile(row.signedCopy!)}
                      >
                        <Eye className="size-3.5" />
                        Preview
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          void downloadFile(row.signedCopy!).catch(() =>
                            notify.error("Could not download the signed copy")
                          )
                        }
                      >
                        <Download className="size-3.5" />
                        Signed copy
                      </Button>
                    </>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={removeMutation.isPending}
                    onClick={() =>
                      removeMutation.mutate(
                        { nodeId: node.id, signatureId: row.id },
                        {
                          onSuccess: () =>
                            notify.success("Signature request removed"),
                          onError: () =>
                            notify.error("Could not remove the request"),
                        }
                      )
                    }
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      <FilePreviewModal
        file={previewFile}
        open={previewFile !== null}
        onOpenChange={(open) => {
          if (!open) setPreviewFile(null);
        }}
      />

      <SignDocumentDialog
        open={signing !== null}
        onOpenChange={(open) => {
          if (!open) setSigning(null);
        }}
        documentName={node.name}
        defaultName={signing?.displayName ?? ""}
        submitting={signMutation.isPending}
        onSign={async (input) => {
          if (!signing) return;
          try {
            await signMutation.mutateAsync({
              nodeId: node.id,
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
