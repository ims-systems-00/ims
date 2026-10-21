import { Link } from "react-router-dom";
import { Copy, ExternalLink, Handshake, Loader2 } from "lucide-react";
import { PageHeader } from "@/shared/layout";
import { EmptyState } from "@/shared/components/empty-state";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/toast";
import { usePartnerDashboardQuery } from "../hooks/use-partnerships";

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-muted/20 px-3 py-3">
      <p className="text-[0.6875rem] font-medium uppercase tracking-[0.06em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1.5 text-xl font-semibold tabular-nums tracking-tight text-foreground">
        {value}
      </p>
    </div>
  );
}

async function copyText(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value);
    notify.success(`${label} copied`);
  } catch {
    notify.error(`Unable to copy ${label.toLowerCase()}`);
  }
}

/**
 * Partner dashboard: referral code/link, aggregate analytics, and the
 * organisations that signed up with the partner code.
 */
export function PartnerDashboardPage() {
  const dashboardQuery = usePartnerDashboardQuery();
  const dashboard = dashboardQuery.data;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Partner programme"
        description="Your referral code, signup link, and the organisations you've referred to iMS."
      />

      {dashboardQuery.isPending ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading partner dashboard…
        </div>
      ) : dashboardQuery.isError || !dashboard ? (
        <EmptyState
          title="You are not an iMS Systems partner"
          description="Join the partner programme to get a referral code and track the organisations you refer."
          icon={<Handshake className="size-4" />}
          action={
            <Button asChild>
              <Link to="/onboard/partner">Become a partner</Link>
            </Button>
          }
        />
      ) : (
        <>
          <section className="ims-panel overflow-hidden">
            <div className="ims-panel-header">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold tracking-tight">
                  Official partner
                </h3>
                <p className="mt-0.5 text-[0.75rem] text-muted-foreground">
                  Status: {dashboard.partnership.status}
                </p>
              </div>
            </div>
            <div className="space-y-4 px-4 py-4">
              <div>
                <p className="text-[0.6875rem] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                  Partner code
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <code className="rounded-md border border-border-subtle bg-muted/30 px-2.5 py-1 text-[0.8125rem] text-foreground">
                    {dashboard.partnerCode}
                  </code>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      void copyText(dashboard.partnerCode, "Partner code")
                    }
                  >
                    <Copy className="size-3.5" />
                    Copy
                  </Button>
                </div>
              </div>
              <div>
                <p className="text-[0.6875rem] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                  Signup link
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded-md border border-border-subtle bg-muted/30 px-2.5 py-1 text-[0.8125rem] text-foreground">
                    {dashboard.signupUrl}
                  </code>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      void copyText(dashboard.signupUrl, "Signup link")
                    }
                  >
                    <Copy className="size-3.5" />
                    Copy
                  </Button>
                  <Button type="button" size="sm" variant="outline" asChild>
                    <a
                      href={dashboard.signupUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLink className="size-3.5" />
                      Open
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
            <StatCard label="Organisations" value={dashboard.stats.organisations} />
            <StatCard label="Business units" value={dashboard.stats.groups} />
            <StatCard label="Users" value={dashboard.stats.users} />
            <StatCard label="Super users" value={dashboard.stats.superUsers} />
            <StatCard label="CRM modules" value={dashboard.stats.crmModules} />
          </div>

          {dashboard.complianceBreakdown.length > 0 ? (
            <section className="ims-panel overflow-hidden">
              <div className="ims-panel-header">
                <h3 className="text-sm font-semibold tracking-tight">
                  Compliance toolkits across referrals
                </h3>
              </div>
              <div className="flex flex-wrap gap-1.5 px-4 py-4">
                {dashboard.complianceBreakdown.map((row) => (
                  <span
                    key={row.toolkit}
                    className="rounded-md border border-border-subtle bg-card px-2.5 py-1 text-[0.75rem] text-foreground"
                  >
                    {row.toolkit} · {row.count}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          <section className="ims-panel overflow-hidden">
            <div className="ims-panel-header">
              <h3 className="text-sm font-semibold tracking-tight">
                Referred organisations
              </h3>
            </div>
            {dashboard.organisations.length === 0 ? (
              <p className="px-4 py-4 text-[0.8125rem] text-muted-foreground">
                No organisations have signed up with your code yet. Share
                your signup link to get started.
              </p>
            ) : (
              <ul className="divide-y divide-border-subtle">
                {dashboard.organisations.map((org) => (
                  <li
                    key={org.id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5"
                  >
                    <span className="text-[0.8125rem] font-medium text-foreground">
                      {org.name}
                    </span>
                    <span className="text-[0.75rem] text-muted-foreground">
                      {org.isCustomer ? "Customer" : "Signed up"} ·{" "}
                      {new Date(org.createdAt).toLocaleDateString()}
                    </span>
                    <span className="ml-auto text-[0.75rem] tabular-nums text-muted-foreground">
                      SA {org.superUser.allocated} · Users{" "}
                      {org.users.allocated} · BU {org.groups.allocated} ·{" "}
                      {org.complianceTools.length} toolkit
                      {org.complianceTools.length === 1 ? "" : "s"}
                      {org.additionalModules.includes("CRM") ? " · CRM" : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
