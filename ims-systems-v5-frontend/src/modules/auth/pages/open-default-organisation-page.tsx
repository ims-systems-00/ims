import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuthClient } from "@/security";
import { loadPublicEnv } from "@/shared/lib/env";
import { isApiClientError } from "@/shared/lib/http/errors";
import { clearActiveOrganisation } from "@/shared/lib/active-organisation";
import { Button } from "@/shared/components/ui/button";
import {
  ensureOrganisationAuth0Link,
  pickDefaultOrganisation,
} from "@/modules/organisation/api/organisations";
import { useMyOrganisationsQuery } from "@/modules/organisation/hooks/use-organisations";
import { useSwitchOrganisationMutation } from "@/modules/organisation/hooks/use-switch-organisation";
import type { Organisation } from "@/modules/organisation/types";
import {
  acceptInvitationPath,
  getPendingInvite,
} from "@/modules/invitations/lib/pending-invite";
import { PageLoader } from "@/shared/components/ims-loader";

export const OPEN_DEFAULT_ORGANISATION_PATH = "/opening-workspace";

/** Only follow in-app paths; anything else lands on the dashboard. */
function safeReturnTo(value: unknown): string {
  if (typeof value !== "string") return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  if (value.startsWith(OPEN_DEFAULT_ORGANISATION_PATH)) return "/";
  if (value.startsWith("/select-organisation")) return "/";
  return value;
}

function errorMessage(error: unknown, fallback: string): string {
  if (isApiClientError(error) || error instanceof Error) return error.message;
  return fallback;
}

/**
 * Post-login step with no choice to make:
 * Login → (intro plays) → bind the user's default organisation → dashboard.
 *
 * The default is the org the user starred in the navbar switcher, else the
 * first org they joined. If it cannot be opened (e.g. Auth0 link fails), the
 * remaining memberships are tried in order so a broken org never locks the
 * user out.
 *
 * Sits outside PostLoginMembershipGate so the gate's "bind first org"
 * fallback does not run before the default is bound.
 */
export function OpenDefaultOrganisationPage() {
  const isStub = loadPublicEnv().VITE_SECURITY_PROVIDER === "development-stub";
  const authClient = useAuthClient();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = safeReturnTo(
    (location.state as { returnTo?: string } | null)?.returnTo
  );

  const orgsQuery = useMyOrganisationsQuery(!isStub);
  const switchMutation = useSwitchOrganisationMutation();
  const [opening, setOpening] = useState<Organisation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  async function openWorkspace(organisations: Organisation[]) {
    setError(null);
    const preferred = pickDefaultOrganisation(organisations);
    const candidates = preferred
      ? [preferred, ...organisations.filter((org) => org.id !== preferred.id)]
      : organisations;

    let lastError: unknown = null;
    for (const org of candidates) {
      setOpening(org);
      try {
        let target = org;
        if (!target.auth0OrganizationId?.trim()) {
          target = await ensureOrganisationAuth0Link(org.id);
        }
        await switchMutation.mutateAsync(target);
        navigate(returnTo, { replace: true });
        return;
      } catch (err) {
        lastError = err;
      }
    }
    setOpening(null);
    setError(errorMessage(lastError, "Unable to open your organisation."));
  }

  useEffect(() => {
    if (started.current || isStub) return;
    if (!orgsQuery.isSuccess || orgsQuery.isFetching) return;
    const organisations = orgsQuery.data ?? [];
    if (organisations.length === 0) return;
    started.current = true;
    void openWorkspace(organisations);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStub, orgsQuery.isSuccess, orgsQuery.isFetching, orgsQuery.data]);

  if (isStub) {
    return <Navigate to={returnTo} replace />;
  }

  if (orgsQuery.isSuccess && (orgsQuery.data?.length ?? 0) === 0) {
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

  const failure =
    error ??
    (orgsQuery.isError
      ? errorMessage(orgsQuery.error, "Couldn’t load your organisations.")
      : null);

  if (failure) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <h1 className="text-base font-medium text-foreground">
          Couldn’t open your workspace
        </h1>
        <p className="max-w-md text-sm text-muted-foreground" role="alert">
          {failure}
        </p>
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          <Button
            type="button"
            onClick={() => {
              setError(null);
              if (orgsQuery.isError || !orgsQuery.data?.length) {
                started.current = false;
                void orgsQuery.refetch();
              } else {
                void openWorkspace(orgsQuery.data);
              }
            }}
          >
            Retry
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              clearActiveOrganisation();
              void authClient.logout().then(() => {
                navigate("/login", { replace: true });
              });
            }}
          >
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  return (
    <PageLoader
      fullScreen
      label={opening ? `Opening ${opening.name}…` : "Preparing your workspace…"}
    />
  );
}
