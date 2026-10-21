import { Navigate, Outlet, useLocation } from "react-router-dom";
import { loadPublicEnv } from "@/shared/lib/env";
import { useMyOrganisationsQuery } from "@/modules/organisation/hooks/use-organisations";
import {
  clearActiveOrganisation,
  getActiveOrganisationId,
  setActiveOrganisationContext,
} from "@/shared/lib/active-organisation";
import { useEffect } from "react";
import { Button } from "@/shared/components/ui/button";

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
  const isStub = env.VITE_SECURITY_PROVIDER === "development-stub";
  const onOnboard = location.pathname.startsWith("/onboard");

  const orgsQuery = useMyOrganisationsQuery(!isStub);

  useEffect(() => {
    if (isStub || !orgsQuery.data?.length) return;
    if (getActiveOrganisationId()) return;
    const first = orgsQuery.data[0]!;
    setActiveOrganisationContext({
      organizationId: first.id,
      auth0OrganizationId: first.auth0OrganizationId,
    });
  }, [isStub, orgsQuery.data]);

  useEffect(() => {
    if (isStub || !orgsQuery.isSuccess) return;
    if ((orgsQuery.data?.length ?? 0) === 0 && getActiveOrganisationId()) {
      // New user / no memberships: drop stale tenant from a previous session.
      clearActiveOrganisation();
    }
  }, [isStub, orgsQuery.isSuccess, orgsQuery.data]);

  if (isStub) {
    return <Outlet />;
  }

  if (orgsQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Preparing your workspace…
      </div>
    );
  }

  if (orgsQuery.isError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm text-muted-foreground">
          We could not load your organisations. You can retry or continue to
          create one.
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => void orgsQuery.refetch()}
          >
            Retry
          </Button>
          <Button
            type="button"
            onClick={() => {
              clearActiveOrganisation();
              window.location.assign("/onboard/organisation");
            }}
          >
            Create organisation
          </Button>
        </div>
      </div>
    );
  }

  const memberships = orgsQuery.data ?? [];
  if (memberships.length === 0 && !onOnboard) {
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
