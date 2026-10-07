import { Link } from "react-router-dom";
import { Building2, Rocket } from "lucide-react";
import { PageHeader } from "@/shared/layout";
import { Button } from "@/shared/components/ui/button";

/**
 * Post-create choice screen (V4 flow-selection parity).
 * Go-live is deferred; users can open My organisation now.
 */
export function FlowSelectionPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        title="What next?"
        description="Your organisation is ready. Go Live (licences, toolkits, billing) will arrive in a later V5 milestone."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <section className="ims-panel overflow-hidden">
          <div className="space-y-3 px-4 py-5">
            <Rocket className="size-6 text-muted-foreground" aria-hidden />
            <h2 className="text-sm font-semibold">Create an iMS (Go Live)</h2>
            <p className="text-[0.8125rem] text-muted-foreground">
              Activate customer status, licences, and compliance toolkits. Not
              available in this foundation build.
            </p>
            <Button type="button" disabled>
              Coming soon
            </Button>
          </div>
        </section>

        <section className="ims-panel overflow-hidden">
          <div className="space-y-3 px-4 py-5">
            <Building2 className="size-6 text-muted-foreground" aria-hidden />
            <h2 className="text-sm font-semibold">My organisation</h2>
            <p className="text-[0.8125rem] text-muted-foreground">
              Review the organisation you just created and continue using the
              workspace in this tenant context.
            </p>
            <Button asChild>
              <Link to="/organisation">Open organisation</Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
