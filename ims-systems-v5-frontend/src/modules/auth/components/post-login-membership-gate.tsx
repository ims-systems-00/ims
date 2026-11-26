import { Navigate, Outlet, useLocation } from "react-router-dom";
import { loadPublicEnv } from "@/shared/lib/env";
import { useMyOrganisationsQuery } from "@/modules/organisation/hooks/use-organisations";
import {
  acceptInvitationPath,
  getPendingInvite,
} from "@/modules/invitations/lib/pending-invite";
import {
  clearActiveOrganisation,
  getActiveOrganisationId,
  setActiveOrganisationContext,
} from "@/shared/lib/active-organisation";
import { useEffect } from "react";
import { Button } from "@/shared/components/ui/button";
import { isApiClientError } from "@/shared/lib/http/errors";
import { useAuthClient } from "@/security";
import { PageLoader } from "@/shared/components/ims-loader";

/**
 * After Auth0 login:
 * - users with no IMS memberships go to organisation onboard;
 * - members of a non-customer, non-partner organisation stay in onboarding
 *   (V4 parity — the workspace unlocks only after Go Live);
 * - customers/partners keep the product shell; first org selected if needed.
 */
export function PostLoginMembershipGate() {
  const env = loadPublicEnv();
  const location = useLocation();
  const authClient = useAuthClient();
  const isStub = env.VITE_SECURITY_PROVIDER === "development-stub";
  const onOnboard = location.pathname.startsWith("/onboard");

  const orgsQuery = useMyOrganisationsQuery(!isStub);

  useEffect(() => {
    // Only bind after a fresh fetch for this session — never from leftover cache.
    if (isStub || orgsQuery.isFetching || !orgsQuery.isSuccess) return;
    if (!orgsQuery.data?.length) return;
    if (getActiveOrganisationId()) return;
    const first = orgsQuery.data[0]!;
    setActiveOrganisationContext({
      organizationId: first.id,
      auth0OrganizationId: first.auth0OrganizationId,
    });
  }, [isStub, orgsQuery.isFetching, orgsQuery.isSuccess, orgsQuery.data]);

  useEffect(() => {
    if (isStub || !orgsQuery.isSuccess) return;
    if ((orgsQuery.data?.length ?? 0) === 0 && getActiveOrganisationId()) {
      // New user / no memberships: drop stale tenant from a previous session.
      clearActiveOrganisation();
    }
  }, [isStub, orgsQuery.isSuccess, orgsQuery.data]);

  useEffect(() => {
    if (isStub || !orgsQuery.isError) return;
    const err = orgsQuery.error;
    const apiErr = isApiClientError(err) ? err : null;
    if (
      apiErr?.status === 401 ||
      apiErr?.code === "UNAUTHORIZED" ||
      apiErr?.code === "ACCOUNT_BLOCKED"
    ) {
      // Stale Auth0 org id in localStorage forces org-bound tokens that 401
      // when the Auth0 Organisation is not linked in IMS yet.
      // Also clear when access is blocked so retry does not keep a dead tenant.
      clearActiveOrganisation();
    }
  }, [isStub, orgsQuery.isError, orgsQuery.error]);

  if (isStub) {
    return <Outlet />;
  }

  if (orgsQuery.isLoading) {
    return (
      <PageLoader label="Preparing your workspace…" fullScreen />
    );
  }

  if (orgsQuery.isError) {
    const err = orgsQuery.error;
    const apiErr = isApiClientError(err) ? err : null;
    const detail =
      apiErr?.message ??
      (err instanceof Error ? err.message : "Unexpected error");
    const isUnauthorized =
      apiErr?.status === 401 || apiErr?.code === "UNAUTHORIZED";
    const isBlocked =
      apiErr?.code === "ACCOUNT_BLOCKED" ||
      (apiErr?.status === 403 && /blocked|no longer active|locked/i.test(detail));

    if (isBlocked) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
          <h1 className="text-base font-medium text-foreground">
            Access blocked
          </h1>
          <p className="max-w-md text-sm text-muted-foreground">
            {detail ||
              "Your account access has been blocked. Contact a Super Admin to restore access."}
          </p>
          {apiErr?.correlationId ? (
            <p className="font-mono text-[11px] text-muted-foreground/80">
              Ref: {apiErr.correlationId}
            </p>
          ) : null}
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              clearActiveOrganisation();
              void authClient.logout();
            }}
          >
            Sign out
          </Button>
        </div>
      );
    }

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <h1 className="text-base font-medium text-foreground">
          Couldn’t load your organisations
        </h1>
        <p className="max-w-md text-sm text-muted-foreground">
          {isUnauthorized
            ? "Your session may have expired. Sign in again, then retry."
            : "This is usually a temporary API or permissions issue — not that you have no organisation. Retry before creating a new one."}
        </p>
        <p className="max-w-md text-xs text-muted-foreground/90">{detail}</p>
        {apiErr?.correlationId ? (
          <p className="font-mono text-[11px] text-muted-foreground/80">
            Ref: {apiErr.correlationId}
          </p>
        ) : null}
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          <Button
            type="button"
            onClick={() => {
              clearActiveOrganisation();
              void orgsQuery.refetch();
            }}
          >
            Retry
          </Button>
          {isUnauthorized ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                clearActiveOrganisation();
                void authClient.logout();
              }}
            >
              Sign in again
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                clearActiveOrganisation();
                void orgsQuery.refetch();
              }}
            >
              Clear saved organisation & retry
            </Button>
          )}
        </div>
        <button
          type="button"
          className="mt-2 text-xs text-muted-foreground underline-offset-4 hover:underline"
          onClick={() => {
            clearActiveOrganisation();
            window.location.assign("/onboard/organisation");
          }}
        >
          Continue to create organisation
        </button>
      </div>
    );
  }

  const memberships = orgsQuery.data ?? [];
  if (memberships.length === 0 && !onOnboard) {
    const pendingInvite = getPendingInvite();
    if (pendingInvite?.token) {
      return (
        <Navigate
          to={acceptInvitationPath(pendingInvite.token, true)}
          replace
        />
      );
    }
    return <Navigate to="/onboard/organisation" replace />;
  }

  // No skip-activation bypass: a non-customer organisation cannot enter
  // the workspace directly (typed URL, bookmark, or stale session).
  if (!onOnboard) {
    const activeOrgId = getActiveOrganisationId();
    const activeOrg = memberships.find((org) => org.id === activeOrgId);
    if (activeOrg && !activeOrg.isCustomer && !activeOrg.isPartner) {
      return <Navigate to="/onboard/flow-selection" replace />;
    }
  }

  return <Outlet />;
}
