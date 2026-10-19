import { Link } from "react-router-dom";
import { Building2, Handshake, Rocket } from "lucide-react";
import { PageHeader } from "@/shared/layout";
import { Button } from "@/shared/components/ui/button";
import { useCurrentOrganisationQuery } from "../hooks/use-organisations";

/**
 * Post-create choice screen (V4 flow-selection parity).
 */
export function FlowSelectionPage() {
  const currentQuery = useCurrentOrganisationQuery();
  const org = currentQuery.data;
  const alreadyCustomer = Boolean(org?.isCustomer);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        title="What next?"
        description={
          org
            ? `${org.name} is ready. Choose how to continue.`
            : "Your organisation is ready. Choose how to continue."
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <section className="ims-panel overflow-hidden">
          <div className="space-y-3 px-4 py-5">
            <Rocket className="size-6 text-muted-foreground" aria-hidden />
            <h2 className="text-sm font-semibold">Create an iMS (Go Live)</h2>
            <p className="text-[0.8125rem] text-muted-foreground">
              Activate customer status, licence pools, compliance toolkits, and
              a one-year reporting period.
            </p>
            {alreadyCustomer ? (
              <Button asChild>
                <Link to="/organisation">Already live — open organisation</Link>
              </Button>
            ) : (
              <Button asChild>
                <Link to="/onboard/go-live">Go Live</Link>
              </Button>
            )}
          </div>
        </section>

        <section className="ims-panel overflow-hidden">
          <div className="space-y-3 px-4 py-5">
            <Building2 className="size-6 text-muted-foreground" aria-hidden />
            <h2 className="text-sm font-semibold">My organisation</h2>
            <p className="text-[0.8125rem] text-muted-foreground">
              Skip activation for now and open the organisation profile in the
              main workspace.
            </p>
            <Button asChild variant="outline">
              <Link to="/organisation">Open organisation</Link>
            </Button>
          </div>
        </section>

        <section className="ims-panel overflow-hidden md:col-span-2">
          <div className="space-y-3 px-4 py-5">
            <Handshake className="size-6 text-muted-foreground" aria-hidden />
            <h2 className="text-sm font-semibold">Become a partner</h2>
            <p className="text-[0.8125rem] text-muted-foreground">
              Partner programme application is not available in this V5 build
              yet.
            </p>
            <Button type="button" disabled>
              Coming soon
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
