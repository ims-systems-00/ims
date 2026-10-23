import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { AuthEntryLayout } from "@/modules/auth";
import { Button } from "@/shared/components/ui/button";
import { isApiClientError } from "@/shared/lib/http/errors";
import { notify } from "@/shared/lib/toast";
import {
  useAcceptInvitationMutation,
  useInvitationPreviewQuery,
} from "../hooks/use-invitations";
import { formatDateTime } from "@/shared/lib/format-date";

/**
 * Accept-invitation landing (emailed link target). The route sits behind
 * RequireAuth, so unauthenticated recipients are sent to /login first
 * and returned here. Acceptance requires the signed-in account email
 * to match the invitation (enforced by the backend).
 */
export function AcceptInvitationPage() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const previewQuery = useInvitationPreviewQuery(token);
  const acceptMutation = useAcceptInvitationMutation();
  const [accepted, setAccepted] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  const hasAccountParam = searchParams.get("hasAccount");
  const preview = previewQuery.data;
  const hasAccount = preview?.hasAccount ?? hasAccountParam !== "false";

  async function handleAccept() {
    if (!token) return;
    setAcceptError(null);
    try {
      const result = await acceptMutation.mutateAsync(token);
      setAccepted(true);
      notify.success(`Welcome to ${result.organisationName}`);
      navigate("/auth/preparation-screen", { replace: true });
    } catch (error) {
      setAcceptError(
        isApiClientError(error)
          ? error.message
          : "Could not accept this invitation. Please try again."
      );
    }
  }

  if (previewQuery.isLoading) {
    return (
      <AuthEntryLayout
        title="Checking your invitation…"
        description="Verifying the invitation link."
      >
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Please wait…
        </p>
      </AuthEntryLayout>
    );
  }

  if (previewQuery.isError || !preview) {
    return (
      <AuthEntryLayout
        title="Invitation unavailable"
        description="This invitation link could not be verified."
      >
        <p className="text-sm text-destructive" role="alert">
          {isApiClientError(previewQuery.error)
            ? previewQuery.error.message
            : "Invitation not found or the link has expired."}
        </p>
        <p className="text-sm text-muted-foreground">
          Ask your organisation administrator to resend the invitation, or{" "}
          <Link
            to="/login"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            go to sign in
          </Link>
          .
        </p>
      </AuthEntryLayout>
    );
  }

  return (
    <AuthEntryLayout
      title={`Join ${preview.organisationName}`}
      description="You've been invited to join an organisation on iMS Systems."
    >
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-lg border border-border-subtle bg-muted/40 px-4 py-3.5">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Mail className="size-4.5" aria-hidden />
          </span>
          <div className="space-y-1 text-sm">
            <p className="text-foreground">
              <span className="font-medium">{preview.inviterName}</span> has
              invited you to join{" "}
              <span className="font-medium">{preview.organisationName}</span>{" "}
              as a <span className="font-medium">{preview.role}</span>.
            </p>
            <p className="text-muted-foreground">
              Invitation for {preview.email} · Expires{" "}
              {formatDateTime(preview.expiresAt)}
            </p>
          </div>
        </div>

        {!hasAccount ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              You don't have an iMS account for this email yet. Register with{" "}
              <span className="font-medium text-foreground">
                {preview.email}
              </span>{" "}
              first, then open this invitation link again.
            </p>
            <Button asChild className="h-10 w-full">
              <Link to="/register">Register</Link>
            </Button>
            <p className="text-center text-[0.8125rem] text-muted-foreground">
              Already registered with a different email? Ask the
              administrator to invite that address instead.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {acceptError ? (
              <p className="text-sm text-destructive" role="alert">
                {acceptError}
              </p>
            ) : null}
            <Button
              type="button"
              className="h-10 w-full"
              disabled={acceptMutation.isPending || accepted}
              onClick={() => void handleAccept()}
            >
              {acceptMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
              {accepted ? "Joining…" : "Join organisation"}
            </Button>
            <p className="text-center text-[0.8125rem] text-muted-foreground">
              Signed in with a different email? The invitation can only be
              accepted by {preview.email}.
            </p>
          </div>
        )}
      </div>
    </AuthEntryLayout>
  );
}
