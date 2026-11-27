import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { EmptyState } from "@/shared/components/empty-state";
import { PageLoader } from "@/shared/components/ims-loader";
import { Button } from "@/shared/components/ui/button";
import { PageHeader } from "@/shared/layout";
import { isApiClientError } from "@/shared/lib/http/errors";
import { ActivityFeed } from "../components/activity-feed";
import { AdviceCards } from "../components/advice-cards";
import { AliceDraftsPanel } from "../components/alice-drafts-panel";
import { useJourneyQuery } from "../hooks/use-alice";
import { ClauseHealthTable } from "../components/clause-health-table";
import { HealthOverview } from "../components/health-overview";
import { useLiveHealthQuery } from "../hooks/use-live-compliance";

function SectionLabel({ id, children }: { id: string; children: string }) {
  return (
    <h2
      id={id}
      className="mb-2 text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-muted-foreground"
    >
      {children}
    </h2>
  );
}

/**
 * Live compliance overview at `/compliance/live`: health per ISO standard,
 * what to do next across modules, recent activity and every monitored clause.
 */
export function LiveComplianceOverviewPage() {
  const query = useLiveHealthQuery();
  const journey = useJourneyQuery();

  return (
    <div className="mx-auto max-w-8xl space-y-5">
      <PageHeader
        title="Live compliance"
        description="Live health of every monitored ISO clause, and what to do next. Updates as your records change."
        actions={
          journey.data ? (
            <Button asChild size="sm" variant="outline">
              <Link to="/compliance/journey">
                Get ready for ISO · {journey.data.done} of {journey.data.total}
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </Button>
          ) : null
        }
      />

      {query.isLoading ? <PageLoader label="Checking your clauses…" /> : null}

      {query.isError ? (
        <p className="ims-alert ims-alert-error" role="alert">
          {isApiClientError(query.error)
            ? query.error.message
            : "Unable to load live compliance."}
        </p>
      ) : null}

      {query.data && !query.data.standards.length ? (
        <EmptyState
          icon={<ShieldCheck />}
          title="No ISO standard set up yet"
          description="Live compliance monitors ISO 9001, ISO 14001 and ISO 45001. Set up one of these toolkits to start."
          action={
            <Button asChild size="sm">
              <Link to="/compliance">Open compliance toolkits</Link>
            </Button>
          }
        />
      ) : null}

      {query.data?.standards.length ? (
        <>
          <HealthOverview standards={query.data.standards} />

          <AliceDraftsPanel />

          <section aria-labelledby="live-do-next">
            <SectionLabel id="live-do-next">Do next, across all modules</SectionLabel>
            <AdviceCards limit={3} />
          </section>

          <ActivityFeed />

          <section aria-labelledby="live-clauses">
            <SectionLabel id="live-clauses">Clause health, live</SectionLabel>
            <ClauseHealthTable clauses={query.data.clauses} />
          </section>
        </>
      ) : null}
    </div>
  );
}
