import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { PageHeader } from "@/shared/layout";
import { isApiClientError } from "@/shared/lib/http/errors";
import { DEV_STUB_IDENTITY } from "@/security";
import { useAccountManagerOverviewQuery } from "../hooks/use-customers";
import { CustomerStageBadge } from "../components/customer-badges";
import type { CustomerStage } from "../types";
import { CUSTOMER_STAGES } from "../types";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-md border border-border bg-surface px-3.5 py-3">
      <p className="text-[0.6875rem] font-medium uppercase tracking-[0.06em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-[0.6875rem] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

/**
 * Personal account manager dashboard (MY CRM).
 * Uses session user id — backend forbids other manager IDs.
 */
export function CustomersOverviewPage() {
  const managerId = DEV_STUB_IDENTITY.subjectId;
  const overviewQuery = useAccountManagerOverviewQuery(managerId);

  return (
    <div className="space-y-5">
      <PageHeader
        title="MY CRM"
        description="Your account-manager portfolio: contracts this month, stage mix, and related analytics."
        actions={
          <Button type="button" variant="outline" asChild>
            <Link to="/customers">Customers</Link>
          </Button>
        }
      />

      {overviewQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading MY CRM…
        </div>
      ) : null}

      {overviewQuery.isError ? (
        <p className="ims-alert ims-alert-error" role="alert">
          {isApiClientError(overviewQuery.error)
            ? overviewQuery.error.message
            : "Unable to load MY CRM overview."}
        </p>
      ) : null}

      {overviewQuery.isSuccess ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="Contracts started"
              value={overviewQuery.data.contractStartedThisMonth}
              hint="This month"
            />
            <StatCard
              label="Contracts ending"
              value={overviewQuery.data.contractEndingThisMonth}
              hint="This month"
            />
            <StatCard
              label="Reviews due"
              value={overviewQuery.data.contractReviewThisMonth}
              hint="This month"
            />
            <StatCard
              label="Highest value"
              value={formatCurrency(
                overviewQuery.data.highestValueCustomer.value
              )}
              hint={overviewQuery.data.highestValueCustomer.name}
            />
          </div>

          <section className="space-y-3">
            <h2 className="ims-text-section">Live customers</h2>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              <StatCard
                label="Highest live"
                value={formatCurrency(
                  overviewQuery.data.mostValuedLiveCustomer.value
                )}
                hint={overviewQuery.data.mostValuedLiveCustomer.name}
              />
              <StatCard
                label="Lowest live"
                value={formatCurrency(
                  overviewQuery.data.lessValuedLiveCustomer.value
                )}
                hint={overviewQuery.data.lessValuedLiveCustomer.name}
              />
              <StatCard
                label="Campaigns"
                value={`${overviewQuery.data.activeCampaign} active`}
                hint={`${overviewQuery.data.closedCampaign} closed · ${overviewQuery.data.latestCampaign}`}
              />
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="ims-text-section">Customers by stage</h2>
            {overviewQuery.data.customerAnalysis.length === 0 ? (
              <p className="ims-text-meta">
                You have no analytics at this moment.
              </p>
            ) : (
              <div className="ims-table-wrap">
                <table className="ims-table">
                  <thead>
                    <tr>
                      <th>Stage</th>
                      <th>Count</th>
                      <th>Contract value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CUSTOMER_STAGES.map((stage) => {
                      const row = overviewQuery.data.customerAnalysis.find(
                        (item) => item.stage === stage
                      );
                      if (!row) return null;
                      return (
                        <tr key={stage}>
                          <td>
                            <CustomerStageBadge
                              stage={stage as CustomerStage}
                            />
                          </td>
                          <td className="tabular-nums">{row.count}</td>
                          <td className="tabular-nums">
                            {formatCurrency(row.contractValue)}
                          </td>
                        </tr>
                      );
                    })}
                    {overviewQuery.data.customerAnalysis
                      .filter(
                        (row) =>
                          !(CUSTOMER_STAGES as readonly string[]).includes(
                            row.stage
                          )
                      )
                      .map((row) => (
                        <tr key={row.stage}>
                          <td>{row.stage}</td>
                          <td className="tabular-nums">{row.count}</td>
                          <td className="tabular-nums">
                            {formatCurrency(row.contractValue)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="ims-text-section">Invoices this month</h2>
            {overviewQuery.data.invoiceAnalysis.length === 0 ? (
              <p className="ims-text-meta">
                No invoice analytics available.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {overviewQuery.data.invoiceAnalysis.map((row) => (
                  <li
                    key={row.status}
                    className="flex justify-between gap-3 rounded-md border border-border px-3 py-2"
                  >
                    <span>{row.status}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {formatCurrency(row.amount)} · {row.count}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="ims-text-section">Interactions</h2>
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                label="Weekly"
                value={
                  overviewQuery.data.interactions.weekly.totalInteractions
                }
                hint={`${overviewQuery.data.interactions.weekly.customersEngaged} customers engaged`}
              />
              <StatCard
                label="Monthly"
                value={
                  overviewQuery.data.interactions.monthly.totalInteractions
                }
                hint={`${overviewQuery.data.interactions.monthly.customersEngaged} customers engaged`}
              />
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
