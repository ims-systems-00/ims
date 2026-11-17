import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { AuthEntryLayout } from "@/modules/auth";
import { Button } from "@/shared/components/ui/button";
import { setActiveOrganisationContext } from "@/shared/lib/active-organisation";
import { formatDateTime } from "@/shared/lib/format-date";
import { isApiClientError } from "@/shared/lib/http/errors";
import { notify } from "@/shared/lib/toast";
import { useAuthClient } from "@/security";
import {
  useAcceptInvitationMutation,
  useInvitationPreviewQuery,
} from "../hooks/use-invitations";
import {
  clearPendingInvite,
  setPendingInvite,
} from "../lib/pending-invite";

/**
 * Emailed invitation landing page (public preview).
 * Unauthenticated invitees can register/sign in with the token preserved;
 * authenticated invitees are auto-accepted into the organisation.
 */
export function AcceptInvitationPage() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const authClient = useAuthClient();
  const previewQuery = useInvitationPreviewQuery(token);
  const acceptMutation = useAcceptInvitationMutation();
  const [authReady, setAuthReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const autoStarted = useRef(false);

  const hasAccountParam = searchParams.get("hasAccount");
  const autoAccept = searchParams.get("auto") === "1";
  const preview = previewQuery.data;
  const hasAccount = preview?.hasAccount ?? hasAccountParam !== "false";

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const ok = await authClient.isAuthenticated();
      if (cancelled) return;
      setAuthenticated(ok);
      setAuthReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [authClient]);

  useEffect(() => {
    if (!token || !preview) return;
    setPendingInvite({
      token,
      email: preview.email,
      organisationName: preview.organisationName,
    });
  }, [token, preview]);

  async function completeAccept() {
    if (!token || accepted || acceptMutation.isPending) return;
    setAcceptError(null);
    try {
      const result = await acceptMutation.mutateAsync(token);
      setAccepted(true);
      setActiveOrganisationContext({
        organizationId: result.organizationId,
        auth0OrganizationId: result.auth0OrganizationId,
      });
      clearPendingInvite();
      notify.success(
        result.alreadyMember
          ? `You are already a member of ${result.organisationName}`
          : `Welcome to ${result.organisationName}`
      );
      navigate("/auth/preparation-screen", { replace: true });
    } catch (error) {
      setAcceptError(
        isApiClientError(error)
          ? error.message
          : "Could not accept this invitation. Please try again."
      );
    }
  }

  useEffect(() => {
    if (!authReady || !authenticated || !preview || !token) return;
    if (autoStarted.current || accepted || acceptMutation.isPending) return;
    // After register (auto=1) always join; otherwise join when an account exists.
    if (!autoAccept && !hasAccount && !preview.hasAccount) return;
    autoStarted.current = true;
    void completeAccept();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once when auth+preview ready
  }, [
    authReady,
    authenticated,
    preview,
    token,
    autoAccept,
    hasAccount,
    accepted,
    acceptMutation.isPending,
  ]);

  const registerHref =
    token && preview
      ? `/register?invite=${encodeURIComponent(token)}&email=${encodeURIComponent(preview.email)}`
      : "/register";
  const loginHref = token
    ? `/login`
    : "/login";
  const loginState = token
    ? {
        returnTo: `/auth/onboard/accept-invitation/${encodeURIComponent(token)}?auto=1`,
      }
    : undefined;

  if (!authReady || previewQuery.isLoading) {
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

  if (authenticated && (autoAccept || hasAccount) && !acceptError) {
    return (
      <AuthEntryLayout
        title={`Joining ${preview.organisationName}`}
        description="Accepting your invitation and opening the organisation workspace."
      >
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Please wait…
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

        {acceptError ? (
          <p className="text-sm text-destructive" role="alert">
            {acceptError}
          </p>
        ) : null}

        {!authenticated ? (
          <div className="space-y-3">
            {!hasAccount ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Create an account with{" "}
                  <span className="font-medium text-foreground">
                    {preview.email}
                  </span>{" "}
                  to join this organisation automatically. You will not need to
                  set up a new organisation.
                </p>
                <Button asChild className="h-10 w-full">
                  <Link to={registerHref}>Create account & join</Link>
                </Button>
                <p className="text-center text-[0.8125rem] text-muted-foreground">
                  Already have an account?{" "}
                  <Link
                    to={loginHref}
                    state={loginState}
                    className="font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Sign in
                  </Link>
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Sign in with{" "}
                  <span className="font-medium text-foreground">
                    {preview.email}
                  </span>{" "}
                  to join this organisation.
                </p>
                <Button asChild className="h-10 w-full">
                  <Link to={loginHref} state={loginState}>
                    Sign in to join
                  </Link>
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <Button
              type="button"
              className="h-10 w-full"
              disabled={acceptMutation.isPending || accepted}
              onClick={() => void completeAccept()}
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
