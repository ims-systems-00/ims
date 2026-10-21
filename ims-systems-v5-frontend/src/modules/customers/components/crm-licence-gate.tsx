import { Link, Outlet } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { EmptyState } from "@/shared/components/empty-state";
import { useCurrentOrganisationQuery } from "@/modules/organisation/hooks/use-organisations";
import { loadPublicEnv } from "@/shared/lib/env";

/**
 * CRM is licensed per organisation (licences.additionalModules includes
 * "CRM") — V4 hid these routes entirely when unlicensed. Dev-stub stays
 * open; Auth0 mode shows a licence notice for direct URLs.
 */
export function CrmLicenceGate() {
  const isAuth0Mode =
    loadPublicEnv().VITE_SECURITY_PROVIDER === "auth0-openfga";
  const orgQuery = useCurrentOrganisationQuery(isAuth0Mode);

  if (!isAuth0Mode) {
    return <Outlet />;
  }
  if (orgQuery.isPending) {
    return <EmptyState title="Loading…" description="Checking your CRM licence." />;
  }
  const licensed = (
    orgQuery.data?.licences.additionalModules ?? []
  ).includes("CRM");
  if (!licensed) {
    return (
      <EmptyState
        title="CRM is not licensed"
        description="The CRM module is not included in your organisation's licences. Add it from Organisation → Request licence."
        action={
          <Button asChild>
            <Link to="/organisation">Go to Organisation</Link>
          </Button>
        }
      />
    );
  }
  return <Outlet />;
}
