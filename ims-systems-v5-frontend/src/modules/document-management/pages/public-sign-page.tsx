import { useState } from "react";
import { CheckCircle2, Loader2, PenLine } from "lucide-react";
import { useParams } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/toast";
import {
  usePublicSignatureQuery,
  useSignDocumentPublicMutation,
} from "../hooks/use-document-management";
import { SignDocumentDialog } from "../components/sign-document-dialog";

/**
 * Public external signing page (spec §10). The emailed token is the only
 * credential; it is invalidated by the backend after signing.
 */
export function PublicSignPage() {
  const { token } = useParams<{ token: string }>();
  const contextQuery = usePublicSignatureQuery(token);
  const signMutation = useSignDocumentPublicMutation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [signed, setSigned] = useState(false);

  const context = contextQuery.data;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-lg space-y-4 rounded-xl border border-border-subtle bg-card p-6 shadow-sm">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            Document signature requested
          </h1>
          <p className="text-sm text-muted-foreground">
            You have been invited to electronically sign a document in iMS.
          </p>
        </div>

        {!token || contextQuery.isError ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-3 text-sm text-destructive">
            This signing link is invalid or has expired. Please ask the sender
            to resend the invitation.
          </p>
        ) : contextQuery.isLoading || !context ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading invitation…
          </div>
        ) : signed || context.signature.status === "Signed" ? (
          <div className="flex items-start gap-2 rounded-md border border-border-subtle px-3 py-3 text-sm">
            <CheckCircle2 className="mt-0.5 size-4 text-emerald-600" />
            <span>
              Thank you — <strong>{context.documentName}</strong> has been
              signed. A copy has been emailed to you and the requester has been
              notified.
            </span>
          </div>
        ) : (
          <>
            <div className="space-y-1 rounded-md border border-border-subtle px-3 py-3 text-sm">
              <p>
                Document: <strong>{context.documentName}</strong>
              </p>
              <p className="text-muted-foreground">
                Invited as: {context.signature.displayName}
              </p>
              {context.signature.message ? (
                <p className="text-muted-foreground">
                  “{context.signature.message}”
                </p>
              ) : null}
            </div>
            <Button
              type="button"
              className="w-full"
              onClick={() => setDialogOpen(true)}
            >
              <PenLine className="size-4" />
              Review and sign
            </Button>
          </>
        )}
      </div>

      {context && token ? (
        <SignDocumentDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          documentName={context.documentName}
          defaultName={
            context.signature.inviteeType === "email"
              ? ""
              : context.signature.displayName
          }
          submitting={signMutation.isPending}
          onSign={async (input) => {
            try {
              await signMutation.mutateAsync({ token, body: input });
              setSigned(true);
              setDialogOpen(false);
            } catch {
              notify.error(
                "Could not sign this document. The link may have expired, or the document is not a PDF."
              );
            }
          }}
        />
      ) : null}
    </div>
  );
}
