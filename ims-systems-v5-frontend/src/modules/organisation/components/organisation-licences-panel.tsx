import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { BadgePoundSterling, CreditCard, KeyRound, Settings2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/toast";
import { toolkitDisplayLabel } from "@/modules/compliance/types";
import {
  organisationKeys,
  useBillingPortalSessionMutation,
  useCardPaymentSessionMutation,
  useSmeLicenceCheckoutMutation,
} from "../hooks/use-organisations";
import type {
  OrganisationLicences,
  OrganisationPaymentSystem,
} from "../types";
import { LicenceRequestHistory } from "./licence-request-history";
import { RequestLicenceSheet } from "./request-licence-sheet";

type OrganisationLicencesPanelProps = {
  organizationId: string;
  licences: OrganisationLicences;
  isCustomer: boolean;
  paymentSystem: OrganisationPaymentSystem;
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
  organizationId,
  licences,
  isCustomer,
  paymentSystem,
}: OrganisationLicencesPanelProps) {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [requestOpen, setRequestOpen] = useState(false);
  const [openingSme, setOpeningSme] = useState(false);
  const [openingCard, setOpeningCard] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);
  const cardPayment = useCardPaymentSessionMutation();
  const smeLicence = useSmeLicenceCheckoutMutation();
  const billingPortal = useBillingPortalSessionMutation();

  // Stripe return / browser back (bfcache) can restore a mid-checkout pending
  // mutation and leave the SME button stuck disabled/"Opening…".
  useEffect(() => {
    function clearCheckoutUiState() {
      setOpeningSme(false);
      setOpeningCard(false);
      setOpeningPortal(false);
      smeLicence.reset();
      cardPayment.reset();
      billingPortal.reset();
    }

    clearCheckoutUiState();

    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) clearCheckoutUiState();
    }

    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
    // Intentionally once on mount + bfcache restore only.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset helpers are stable enough for mount
  }, []);

  const smeCheckoutResult = searchParams.get("sme");
  useEffect(() => {
    if (smeCheckoutResult !== "success" && smeCheckoutResult !== "cancelled") {
      return;
    }

    const next = new URLSearchParams(searchParams);
    next.delete("sme");
    setSearchParams(next, { replace: true });

    void queryClient.invalidateQueries({
      queryKey: organisationKeys.current(),
    });

    if (smeCheckoutResult === "success") {
      notify.success("SME licence checkout completed");
    }
  }, [queryClient, searchParams, setSearchParams, smeCheckoutResult]);

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
  const hasSubscription = Boolean(paymentSystem.stripeSubscriptionId);
  const billingBusy = openingSme || openingCard || openingPortal;

  async function openCardCheckout() {
    setOpeningCard(true);
    try {
      const session = await cardPayment.mutateAsync(organizationId);
      if (!session.url) {
        notify.error("Stripe checkout did not return a URL");
        setOpeningCard(false);
        return;
      }
      window.location.assign(session.url);
    } catch (error) {
      setOpeningCard(false);
      notify.fromError(error, "Unable to start card payment");
    }
  }

  async function openSmeCheckout() {
    setOpeningSme(true);
    try {
      const session = await smeLicence.mutateAsync(organizationId);
      if (!session.url) {
        notify.error("Stripe checkout did not return a URL");
        setOpeningSme(false);
        return;
      }
      window.location.assign(session.url);
    } catch (error) {
      setOpeningSme(false);
      notify.fromError(error, "Unable to start SME licence checkout");
    }
  }

  async function openBillingPortal() {
    setOpeningPortal(true);
    try {
      const session = await billingPortal.mutateAsync(organizationId);
      if (!session.url) {
        notify.error("Stripe billing portal did not return a URL");
        setOpeningPortal(false);
        return;
      }
      window.location.assign(session.url);
    } catch (error) {
      setOpeningPortal(false);
      notify.fromError(error, "Unable to open billing portal");
    }
  }

  return (
    <>
      <section className="ims-panel overflow-hidden">
        <div className="space-y-3 border-b border-border-subtle px-4 py-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold tracking-tight">Licenses</h3>
            <p className="mt-0.5 text-[0.75rem] text-muted-foreground">
              Billing: {paymentSystem.status}
              {paymentSystem.type ? ` · ${paymentSystem.type}` : ""}
              {hasSubscription ? " · subscribed" : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={billingBusy}
              onClick={() => void openSmeCheckout()}
            >
              <BadgePoundSterling className="size-3.5" />
              {openingSme ? "Opening…" : "SME License"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={billingBusy}
              onClick={() => setRequestOpen(true)}
            >
              <KeyRound className="size-3.5" />
              Request licence
            </Button>
            {hasSubscription ? (
              <Button
                type="button"
                size="sm"
                disabled={billingBusy}
                onClick={() => void openBillingPortal()}
              >
                <Settings2 className="size-3.5" />
                {openingPortal ? "Opening…" : "Manage billing"}
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                disabled={billingBusy}
                onClick={() => void openCardCheckout()}
              >
                <CreditCard className="size-3.5" />
                {openingCard ? "Opening…" : "Card payment"}
              </Button>
            )}
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

          <LicenceRequestHistory />
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
