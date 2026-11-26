import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Building2, ChevronRight } from "lucide-react";
import { useAuthClient } from "@/security";
import { loadPublicEnv } from "@/shared/lib/env";
import { isApiClientError } from "@/shared/lib/http/errors";
import { clearActiveOrganisation } from "@/shared/lib/active-organisation";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { ensureOrganisationAuth0Link } from "@/modules/organisation/api/organisations";
import {
  useMyOrganisationsQuery,
  useOrganisationLogoUrl,
} from "@/modules/organisation/hooks/use-organisations";
import { useSwitchOrganisationMutation } from "@/modules/organisation/hooks/use-switch-organisation";
import type { Organisation } from "@/modules/organisation/types";
import {
  acceptInvitationPath,
  getPendingInvite,
} from "@/modules/invitations/lib/pending-invite";
import { AuthEntryLayout } from "../components/auth-entry-layout";
import { playPostLoginIntro } from "../intro/play-post-login-intro";
import { ImsLoader, PageLoader } from "@/shared/components/ims-loader";

export const SELECT_ORGANISATION_PATH = "/select-organisation";

/** Only follow in-app paths; anything else lands on the dashboard. */
function safeReturnTo(value: unknown): string {
  if (typeof value !== "string") return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  if (value.startsWith(SELECT_ORGANISATION_PATH)) return "/";
  return value;
}

function orgStatusBadge(org: Organisation) {
  if (org.isPartner) return <Badge variant="info">Partner</Badge>;
  if (org.isCustomer) {
    return org.status === "Paused" ? (
      <Badge variant="warning">Paused</Badge>
    ) : (
      <Badge variant="success">Active</Badge>
    );
  }
  return <Badge variant="muted">Setting up</Badge>;
}

function OrganisationAvatar({ org }: { org: Organisation }) {
  const logoUrl = useOrganisationLogoUrl(org);
  const [failed, setFailed] = useState(false);
  if (logoUrl && !failed) {
    return (
      <img
        src={logoUrl}
        alt=""
        className="size-10 shrink-0 rounded-lg border border-border bg-background object-contain p-1"
        onError={() => setFailed(true)}
      />
    );
  }
  const initials = org.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
  return (
    <span
      aria-hidden
      className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary"
    >
      {initials || <Building2 className="size-4" />}
    </span>
  );
}

/**
 * Post-login organisation picker:
 * Login → choose organisation → iMS OS intro → chosen org's dashboard.
 *
 * Sits outside PostLoginMembershipGate so the gate's "bind first org"
 * fallback does not pre-empt the user's choice.
 */
export function SelectOrganisationPage() {
  const provider = loadPublicEnv().VITE_SECURITY_PROVIDER;
  const isStub = provider === "development-stub";
  const authClient = useAuthClient();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = safeReturnTo(
    (location.state as { returnTo?: string } | null)?.returnTo
  );

  const orgsQuery = useMyOrganisationsQuery(!isStub);
  const switchMutation = useSwitchOrganisationMutation();
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const autoSelected = useRef(false);

  const organisations = orgsQuery.data ?? [];
  const busy = selectingId !== null;

  async function choose(org: Organisation) {
    if (busy) return;
    setError(null);
    setSelectingId(org.id);
    try {
      let target = org;
      if (!isStub && !org.auth0OrganizationId?.trim()) {
        target = await ensureOrganisationAuth0Link(org.id);
      }
      await switchMutation.mutateAsync(target);
      playPostLoginIntro();
      navigate(returnTo, { replace: true });
    } catch (err) {
      setError(
        isApiClientError(err) || err instanceof Error
          ? err.message
          : `Unable to open ${org.name}. Please try again.`
      );
      setSelectingId(null);
    }
  }

  // A single membership has nothing to choose between — continue straight on.
  useEffect(() => {
    if (autoSelected.current) return;
    if (!orgsQuery.isSuccess || orgsQuery.isFetching) return;
    if (orgsQuery.data?.length !== 1) return;
    autoSelected.current = true;
    void choose(orgsQuery.data[0]!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgsQuery.isSuccess, orgsQuery.isFetching, orgsQuery.data]);

  if (isStub) {
    return <Navigate to={returnTo} replace />;
  }

  if (orgsQuery.isSuccess && organisations.length === 0) {
    const pendingInvite = getPendingInvite();
    return (
      <Navigate
        to={
          pendingInvite?.token
            ? acceptInvitationPath(pendingInvite.token, true)
            : "/onboard/organisation"
        }
        replace
      />
    );
  }

  const description =
    organisations.length > 1
      ? `You belong to ${organisations.length} organisations. Choose the one you want to work in — you can switch any time from the top bar.`
      : "Choose the organisation you want to continue with.";

  return (
    <AuthEntryLayout title="Choose an organisation" description={description}>
      {orgsQuery.isLoading ||
      (orgsQuery.isSuccess && organisations.length === 1) ? (
        <PageLoader
          compact
          label={
            organisations.length === 1
              ? `Opening ${organisations[0]!.name}…`
              : "Loading your organisations…"
          }
        />
      ) : orgsQuery.isError ? (
        <div className="space-y-3">
          <p className="text-sm text-destructive" role="alert">
            {isApiClientError(orgsQuery.error)
              ? orgsQuery.error.message
              : "Couldn’t load your organisations."}
          </p>
          <Button type="button" onClick={() => void orgsQuery.refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <ul
          className="max-h-[26rem] space-y-2 overflow-y-auto pr-1"
          aria-label="Your organisations"
        >
          {organisations.map((org) => {
            const selecting = selectingId === org.id;
            return (
              <li key={org.id}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void choose(org)}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-3 text-left transition-colors",
                    "hover:border-primary/50 hover:bg-primary/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                    "disabled:cursor-not-allowed",
                    busy && !selecting && "opacity-50",
                    selecting && "border-primary/60 bg-primary/[0.04]"
                  )}
                >
                  <OrganisationAvatar org={org} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {org.name}
                    </span>
                    <span className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      {orgStatusBadge(org)}
                      {org.reference ? (
                        <span className="truncate">{org.reference}</span>
                      ) : null}
                    </span>
                  </span>
                  {selecting ? (
                    <ImsLoader size="xs" />
                  ) : (
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <p className="text-center text-[0.8125rem] text-muted-foreground">
        Not you?{" "}
        <button
          type="button"
          className="font-medium text-primary underline-offset-4 hover:underline"
          onClick={() => {
            clearActiveOrganisation();
            void authClient.logout().then(() => {
              navigate("/login", { replace: true });
            });
          }}
        >
          Sign out
        </button>
      </p>
    </AuthEntryLayout>
  );
}
