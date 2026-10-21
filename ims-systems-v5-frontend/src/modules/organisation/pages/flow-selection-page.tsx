import { Link } from "react-router-dom";
import { ArrowRight, Handshake, Rocket } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import {
  OnboardCard,
  OnboardHeader,
} from "../components/onboarding-ui";
import { useCurrentOrganisationQuery } from "../hooks/use-organisations";

/**
 * Step 2 — choose Go Live (customer activation) or the partner programme.
 * V4 parity: there is no "skip activation" path into the workspace.
 */
export function FlowSelectionPage() {
  const currentQuery = useCurrentOrganisationQuery();
  const org = currentQuery.data;
  const alreadyCustomer = Boolean(org?.isCustomer);
  const alreadyPartner = Boolean(org?.isPartner);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
        <OnboardHeader
        eyebrow="Step 2 of 3"
        title="How will you use iMS?"
        description={
          org
            ? `${org.name} is created. Choose how to continue — your workspace unlocks once activation is complete.`
            : "Your organisation is created. Choose how to continue."
        }
      />


      <div className="grid gap-4 md:grid-cols-2">
        <OnboardCard className="group relative transition-shadow hover:shadow-[0_2px_4px_color-mix(in_oklch,var(--foreground)_5%,transparent),0_16px_40px_-16px_color-mix(in_oklch,var(--primary)_25%,transparent)]">
          <span className="absolute right-4 top-4 rounded-full bg-primary/10 px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-primary">
            Recommended
          </span>
          <div className="flex h-full flex-col px-5 py-5 md:px-6">
            <span
              aria-hidden
              className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"
            >
              <Rocket className="size-5" />
            </span>
            <h2 className="mt-4 text-base font-semibold tracking-tight">
              Create an iMS — Go Live
            </h2>
            <p className="mt-1.5 flex-1 text-[0.8125rem] leading-relaxed text-muted-foreground">
              Activate your organisation as a customer: licence seats,
              compliance toolkits, and a one-year reporting period.
            </p>
            {alreadyCustomer ? (
              <Button asChild className="mt-5 w-full">
                <Link to="/organisation">
                  Already live — open workspace
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </Button>
            ) : (
              <Button asChild className="mt-5 w-full">
                <Link to="/onboard/go-live">
                  Continue to Go Live
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </Button>
            )}
          </div>
        </OnboardCard>

        <OnboardCard
          className={cn("border-dashed bg-surface-muted/30 shadow-none")}
        >
          <div className="flex h-full flex-col px-5 py-5 md:px-6">
            <span
              aria-hidden
              className="flex size-10 items-center justify-center rounded-xl border border-border bg-surface text-muted-foreground"
            >
              <Handshake className="size-5" />
            </span>
            <h2 className="mt-4 text-base font-semibold tracking-tight">
              Become a partner
            </h2>
            <p className="mt-1.5 flex-1 text-[0.8125rem] leading-relaxed text-muted-foreground">
              Refer and support iMS customers through the partner programme.
              Get a referral code and track your referred organisations.
            </p>
            {alreadyPartner ? (
              <Button asChild variant="outline" className="mt-5 w-full">
                <Link to="/partner/dashboard">
                  Open partner dashboard
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </Button>
            ) : (
              <Button asChild variant="outline" className="mt-5 w-full">
                <Link to="/onboard/partner">
                  Apply to become a partner
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </Button>
            )}
          </div>
        </OnboardCard>
      </div>

      <p className="text-center text-[0.75rem] text-muted-foreground">
        Your workspace unlocks as soon as Go Live is complete — partners get
        access as soon as their application is submitted.
      </p>
    </div>
  );
}
