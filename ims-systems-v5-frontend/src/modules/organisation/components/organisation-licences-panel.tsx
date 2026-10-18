import { useState } from "react";
import { CreditCard, KeyRound } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/toast";
import { toolkitDisplayLabel } from "@/modules/compliance/types";
import type { OrganisationLicences } from "../types";
import { RequestLicenceSheet } from "./request-licence-sheet";

type OrganisationLicencesPanelProps = {
  licences: OrganisationLicences;
  isCustomer: boolean;
};

function LicenceStat({
  label,
  used,
  allocated,
}: {
  label: string;
  used: number;
  allocated: number;
}) {
  return (
    <div className="rounded-lg border border-border-subtle bg-muted/20 px-3 py-3">
      <p className="text-[0.6875rem] font-medium uppercase tracking-[0.06em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1.5 text-xl font-semibold tabular-nums tracking-tight text-foreground">
        {used}/{allocated}
      </p>
    </div>
  );
}

/**
 * Organisation licences summary — seats, toolkits, modules + request / payment actions.
 */
export function OrganisationLicencesPanel({
  licences,
  isCustomer,
}: OrganisationLicencesPanelProps) {
  const [requestOpen, setRequestOpen] = useState(false);

  if (!isCustomer) {
    return (
      <section className="ims-panel overflow-hidden">
        <div className="ims-panel-header">
          <h3 className="text-sm font-semibold tracking-tight">Licenses</h3>
        </div>
        <div className="px-4 py-4">
          <p className="text-[0.8125rem] text-muted-foreground">
            Licence management is available for customer organisations after
            go-live.
          </p>
        </div>
      </section>
    );
  }

  const toolkits = licences.complianceTools ?? [];
  const modules = licences.additionalModules ?? [];

  return (
    <>
      <section className="ims-panel overflow-hidden">
        <div className="ims-panel-header">
          <h3 className="text-sm font-semibold tracking-tight">Licenses</h3>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setRequestOpen(true)}
            >
              <KeyRound className="size-3.5" />
              Request licence
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() =>
                notify.info(
                  "Card payment / Stripe checkout is not configured in V5 yet. Use Request licence for demo allocation."
                )
              }
            >
              <CreditCard className="size-3.5" />
              Card payment
            </Button>
          </div>
        </div>

        <div className="space-y-5 px-4 py-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <LicenceStat
              label="Super user"
              used={licences.superUser.used}
              allocated={licences.superUser.allocated}
            />
            <LicenceStat
              label="User"
              used={licences.users.used}
              allocated={licences.users.allocated}
            />
            <LicenceStat
              label="Business unit"
              used={licences.groups.used}
              allocated={licences.groups.allocated}
            />
          </div>

          <div>
            <p className="text-[0.6875rem] font-medium uppercase tracking-[0.06em] text-muted-foreground">
              Compliance Toolkits
            </p>
            {toolkits.length === 0 ? (
              <p className="mt-2 text-[0.8125rem] text-muted-foreground">N/A</p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {toolkits.map((name) => (
                  <span
                    key={name}
                    className="rounded-md border border-border-subtle bg-card px-2.5 py-1 text-[0.75rem] text-foreground"
                  >
                    {toolkitDisplayLabel(name)}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-[0.6875rem] font-medium uppercase tracking-[0.06em] text-muted-foreground">
              Additional modules
            </p>
            <p className="mt-2 text-[0.8125rem] text-foreground">
              {modules.length > 0 ? modules.join(", ") : "N/A"}
            </p>
          </div>
        </div>
      </section>

      <RequestLicenceSheet
        open={requestOpen}
        onOpenChange={setRequestOpen}
        existing={licences}
      />
    </>
  );
}
