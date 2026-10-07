import { Link } from "react-router-dom";
import { Activity, AlertTriangle, RefreshCw, Shield } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { StatusBadge } from "@/shared/components/status-badge";
import { PageHeader } from "@/shared/layout";
import { isApiClientError } from "@/shared/lib/http/errors";
import { cn } from "@/shared/lib/utils";
import {
  useAuditStatsQuery,
  useCipStatsQuery,
  useComplianceStatsQuery,
  useCrmStatsQuery,
  useDigitalMaturityStatsQuery,
  useGlobalStatsQuery,
  useIncidentStatsQuery,
  useInventoryStatsQuery,
  useOrganisationDashboardQuery,
  useRefreshOrganisationDashboard,
  useRiskStatsQuery,
  useSupplierStatsQuery,
} from "../hooks/use-dashboard";
import {
  formatAccurateAs,
  formatCurrency,
  formatHours,
  formatInteger,
  organisationalStateTone,
} from "../lib/format";
import type { OrganisationalState } from "../types";
import { DashboardKpiCard } from "../components/dashboard-kpi-card";
import {
  DashboardBarList,
  DashboardCategoryBarChart,
  DashboardDonutChart,
  DashboardSeriesChart,
} from "../components/dashboard-charts";
import {
  DashboardEmptyState,
  DashboardPanel,
  DashboardUnavailableState,
} from "../components/dashboard-panel";

function OrgPulseHero({
  state,
  confidence,
  criticalArea,
  isCriticalLoading,
}: {
  state?: OrganisationalState;
  confidence?: number;
  criticalArea?: string | null;
  isCriticalLoading: boolean;
}) {
  const tone = state ? organisationalStateTone(state) : "neutral";
  const ringClass =
    tone === "success"
      ? "from-success/25 via-surface to-surface"
      : tone === "warning"
        ? "from-warning/30 via-surface to-surface"
        : tone === "destructive"
          ? "from-destructive/20 via-surface to-surface"
          : tone === "info"
            ? "from-info/20 via-surface to-surface"
            : "from-surface-muted via-surface to-surface";

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-lg border border-border bg-surface shadow-sm ring-1 ring-border-subtle",
        "col-span-12 lg:col-span-5"
      )}
      aria-label="Organisational pulse"
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-90",
          ringClass
        )}
        aria-hidden
      />
      <div className="relative flex h-full flex-col justify-between gap-5 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Organisational pulse
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]">
              {state ?? "—"}
            </h2>
            <p className="max-w-sm text-[0.8125rem] leading-relaxed text-muted-foreground">
              Live posture derived from Dashboard and Stats. Treat this as the
              primary signal before drilling into module panels.
            </p>
          </div>
          <span
            className={cn(
              "inline-flex size-10 shrink-0 items-center justify-center rounded-md border border-border-subtle bg-surface/80",
              tone === "destructive" || tone === "warning"
                ? "text-warning-foreground"
                : "text-foreground"
            )}
            aria-hidden
          >
            {tone === "destructive" || tone === "warning" ? (
              <AlertTriangle className="size-5" />
            ) : (
              <Shield className="size-5" />
            )}
          </span>
        </div>

        <div className="flex flex-wrap items-end gap-6">
          <div>
            <p className="text-[0.6875rem] uppercase tracking-[0.06em] text-muted-foreground">
              Confidence
            </p>
            <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-foreground">
              {confidence != null ? `${formatInteger(confidence)}%` : "—"}
            </p>
          </div>
          <div className="min-w-0 flex-1 border-l border-border-subtle pl-5">
            <p className="text-[0.6875rem] uppercase tracking-[0.06em] text-muted-foreground">
              Critical area
            </p>
            {isCriticalLoading && criticalArea == null ? (
              <p className="mt-1 text-sm text-muted-foreground">Loading…</p>
            ) : (
              <p className="mt-1 truncate text-base font-medium text-foreground">
                {criticalArea && criticalArea !== "No Critical Area"
                  ? criticalArea
                  : "None flagged"}
              </p>
            )}
            {state ? (
              <div className="mt-2">
                <StatusBadge tone={tone}>State: {state}</StatusBadge>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Organisation Live Dashboard Phase 1.
 * Primary: GET /dashboard/organisation
 * Panels: independent GET /stats/* queries
 * Layout: corporate bento with visual hierarchy + Recharts.
 */
export function OrganisationDashboardPage() {
  const dashboardQuery = useOrganisationDashboardQuery();
  const globalStatsQuery = useGlobalStatsQuery();
  const maturityQuery = useDigitalMaturityStatsQuery();
  const complianceQuery = useComplianceStatsQuery();
  const auditStatsQuery = useAuditStatsQuery();
  const riskStatsQuery = useRiskStatsQuery(12);
  const incidentStatsQuery = useIncidentStatsQuery();
  const inventoryStatsQuery = useInventoryStatsQuery();
  const supplierStatsQuery = useSupplierStatsQuery();
  const cipStatsQuery = useCipStatsQuery();
  const crmStatsQuery = useCrmStatsQuery();
  const refresh = useRefreshOrganisationDashboard();

  const accurateAs =
    dashboardQuery.data?.accurateAs ?? globalStatsQuery.data?.accurateAs;
  const organisationalState =
    globalStatsQuery.data?.organizationalState ??
    dashboardQuery.data?.headline.organisationalState;
  const confidence =
    globalStatsQuery.data?.organizationalConfidence ??
    dashboardQuery.data?.headline.organisationalConfidence;
  const criticalArea = globalStatsQuery.data?.criticalArea;
  const isRefreshing =
    dashboardQuery.isFetching ||
    globalStatsQuery.isFetching ||
    maturityQuery.isFetching ||
    complianceQuery.isFetching ||
    auditStatsQuery.isFetching ||
    riskStatsQuery.isFetching ||
    incidentStatsQuery.isFetching ||
    inventoryStatsQuery.isFetching ||
    supplierStatsQuery.isFetching ||
    cipStatsQuery.isFetching ||
    crmStatsQuery.isFetching;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organisation Live Dashboard"
        description="Operational command view for the current organisation — posture first, trends second, module detail third."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {accurateAs ? (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-surface px-2.5 py-1 text-[0.75rem] text-muted-foreground">
                <Activity className="size-3.5" aria-hidden />
                Accurate as {formatAccurateAs(accurateAs)}
              </span>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isRefreshing}
              onClick={() => {
                void refresh();
              }}
            >
              <RefreshCw
                className={isRefreshing ? "animate-spin" : undefined}
                aria-hidden
              />
              Refresh
            </Button>
          </div>
        }
      />

      {dashboardQuery.isError ? (
        <p className="ims-alert ims-alert-error" role="alert">
          {isApiClientError(dashboardQuery.error)
            ? dashboardQuery.error.message
            : "Unable to load the organisation dashboard summary."}
        </p>
      ) : null}

      {dashboardQuery.isLoading ? (
        <div
          className="grid grid-cols-12 gap-3"
          aria-busy="true"
          aria-label="Loading summary cards"
        >
          <div className="col-span-12 h-44 animate-pulse rounded-lg border border-border bg-surface-muted lg:col-span-5" />
          <div className="col-span-12 h-44 animate-pulse rounded-lg border border-border bg-surface-muted lg:col-span-7" />
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="col-span-6 h-[5.5rem] animate-pulse rounded-lg border border-border bg-surface-muted sm:col-span-4 lg:col-span-2"
            />
          ))}
        </div>
      ) : null}

      {dashboardQuery.isSuccess ? (
        <>
          <div className="grid grid-cols-12 gap-3">
            <OrgPulseHero
              state={organisationalState}
              confidence={confidence}
              criticalArea={criticalArea}
              isCriticalLoading={
                globalStatsQuery.isLoading && !globalStatsQuery.isSuccess
              }
            />

            <div
              className="col-span-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:col-span-7"
              role="group"
              aria-label="Organisation summary"
            >
              <DashboardKpiCard
                emphasis="featured"
                label="Open tasks"
                value={formatInteger(dashboardQuery.data.counts.openTasks)}
                hint="Action queue"
                href="/tasks"
              />
              <DashboardKpiCard
                emphasis="featured"
                label="Risks"
                value={formatInteger(
                  dashboardQuery.data.modules.risks?.total ?? 0
                )}
                hint={
                  dashboardQuery.data.unavailable.includes("risks")
                    ? "Unavailable"
                    : `${formatInteger(dashboardQuery.data.modules.risks?.open ?? 0)} open`
                }
                href="/risks"
              />
              <DashboardKpiCard
                emphasis="featured"
                label="Staff"
                value={formatInteger(dashboardQuery.data.counts.staff)}
                hint={`${formatInteger(dashboardQuery.data.counts.remoteStaff)} remote`}
                href="/users"
              />
              <DashboardKpiCard
                emphasis="muted"
                label="Business units"
                value={formatInteger(dashboardQuery.data.counts.businessUnits)}
                href="/functional-units"
              />
              <DashboardKpiCard
                emphasis="muted"
                label="Compliance bodies"
                value={formatInteger(
                  dashboardQuery.data.counts.complianceBodies
                )}
                href="/functional-units"
              />
              <DashboardKpiCard
                emphasis="muted"
                label="Premises"
                value={formatInteger(dashboardQuery.data.counts.premises)}
                href="/business-premises"
              />
            </div>
          </div>

          {(criticalArea || !globalStatsQuery.isSuccess) && (
            <p className="sr-only">
              {criticalArea
                ? `Critical area: ${criticalArea}`
                : "Critical area: loading…"}
            </p>
          )}

          {dashboardQuery.data.unavailable.length > 0 ? (
            <p className="text-[0.75rem] text-muted-foreground">
              Some module summaries were unavailable during aggregation:{" "}
              {dashboardQuery.data.unavailable.join(", ")}.
            </p>
          ) : null}
        </>
      ) : null}

      {/* Bento — primary analytics (risk) */}
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 lg:col-span-7">
          <DashboardPanel
            title="Risk trends"
            description="Volume by risk type across the last 12 months — primary trend signal."
            href="/risks"
            hrefLabel="Risks"
            isLoading={riskStatsQuery.isLoading}
            isError={riskStatsQuery.isError}
            error={riskStatsQuery.error}
            emphasis="featured"
          >
            {riskStatsQuery.data ? (
              <DashboardSeriesChart
                months={riskStatsQuery.data.byType.months}
                series={riskStatsQuery.data.byType.series}
                ariaLabel="Risk counts by type per month"
                height={268}
              />
            ) : null}
          </DashboardPanel>
        </div>

        <div className="col-span-12 lg:col-span-5">
          <DashboardPanel
            title="Risk status"
            description="Open, mitigated, accepted, and escalated over time."
            href="/risks"
            hrefLabel="Risks"
            isLoading={riskStatsQuery.isLoading}
            isError={riskStatsQuery.isError}
            error={riskStatsQuery.error}
            emphasis="featured"
          >
            {riskStatsQuery.data ? (
              <div className="space-y-4">
                <DashboardSeriesChart
                  months={riskStatsQuery.data.byStatus.months}
                  series={riskStatsQuery.data.byStatus.series}
                  ariaLabel="Risk counts by status per month"
                  height={168}
                />
                <div className="border-t border-border-subtle pt-3">
                  <p className="mb-2 text-[0.75rem] font-medium text-muted-foreground">
                    Top business functions by risk
                  </p>
                  <DashboardBarList
                    ariaLabel="Top business units by risk count"
                    emptyTitle="No business-unit risk totals in sample"
                    items={riskStatsQuery.data.topBusinessFunctions.map(
                      (row) => ({
                        label: row.name,
                        value: row.total,
                      })
                    )}
                  />
                </div>
              </div>
            ) : null}
          </DashboardPanel>
        </div>
      </div>

      {/* Bento — operational secondary */}
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 md:col-span-6 xl:col-span-4">
          <DashboardPanel
            title="Incident resolution"
            description="Average resolution time by priority."
            href="/incidents"
            hrefLabel="Incidents"
            isLoading={globalStatsQuery.isLoading}
            isError={globalStatsQuery.isError}
            error={globalStatsQuery.error}
          >
            {globalStatsQuery.data ? (
              <ul
                className="space-y-2"
                aria-label="Resolution times by priority"
              >
                {globalStatsQuery.data.incidentResolutionTimes.map((row) => (
                  <li
                    key={row.priority}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border-subtle bg-surface-muted/30 px-3 py-2.5 text-sm"
                  >
                    <span className="font-medium">{row.priority}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {formatHours(row.averageHours)} ·{" "}
                      {formatInteger(row.count)} resolved
                    </span>
                    {row.alert ? (
                      <StatusBadge tone="warning">Above target</StatusBadge>
                    ) : row.targetHours == null ? (
                      <StatusBadge tone="neutral">No target set</StatusBadge>
                    ) : (
                      <StatusBadge tone="success">Within target</StatusBadge>
                    )}
                  </li>
                ))}
              </ul>
            ) : null}
          </DashboardPanel>
        </div>

        <div className="col-span-12 md:col-span-6 xl:col-span-4">
          <DashboardPanel
            title="Incidents by business function"
            href="/incidents"
            hrefLabel="Incidents"
            isLoading={incidentStatsQuery.isLoading}
            isError={incidentStatsQuery.isError}
            error={incidentStatsQuery.error}
          >
            {incidentStatsQuery.data ? (
              incidentStatsQuery.data.byBusinessFunction.length === 0 ? (
                <DashboardEmptyState
                  title="No incident data"
                  description="No business-unit incidents were returned for the current sample."
                />
              ) : (
                <DashboardCategoryBarChart
                  ariaLabel="Incidents by business unit"
                  emptyTitle="No incident data"
                  items={incidentStatsQuery.data.byBusinessFunction.map(
                    (row) => ({
                      label: row.name,
                      value: row.total,
                      hint: `${formatInteger(row.resolved)} resolved`,
                    })
                  )}
                />
              )
            ) : null}
          </DashboardPanel>
        </div>

        <div className="col-span-12 xl:col-span-4">
          <DashboardPanel
            title="Audits"
            description="Schedule mix and non-conformities."
            href="/audits/internal"
            hrefLabel="Audits"
            isLoading={auditStatsQuery.isLoading}
            isError={auditStatsQuery.isError}
            error={auditStatsQuery.error}
          >
            {auditStatsQuery.data ? (
              <div className="space-y-3">
                <DashboardDonutChart
                  ariaLabel="Audit schedule mix"
                  centerLabel="total"
                  centerValue={formatInteger(auditStatsQuery.data.total)}
                  height={168}
                  slices={[
                    {
                      label: "Scheduled",
                      value: auditStatsQuery.data.scheduled,
                    },
                    {
                      label: "Completed",
                      value: auditStatsQuery.data.completed,
                    },
                  ]}
                />
                <div className="border-t border-border-subtle pt-3">
                  <p className="mb-2 text-[0.75rem] font-medium text-muted-foreground">
                    Non-conformities by unit
                  </p>
                  <DashboardBarList
                    ariaLabel="Non-conformities by business unit"
                    emptyTitle="No non-conformities in sample"
                    items={auditStatsQuery.data.nonConformitiesByBusinessUnit.map(
                      (row) => ({
                        label: row.name,
                        value: row.count,
                      })
                    )}
                  />
                </div>
              </div>
            ) : null}
          </DashboardPanel>
        </div>
      </div>

      {/* Bento — module snapshot strip + CIP / suppliers */}
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 lg:col-span-4">
          <DashboardPanel
            title="Module snapshot"
            description="Headline counts from Dashboard aggregation."
            isLoading={dashboardQuery.isLoading}
            isError={dashboardQuery.isError}
            error={dashboardQuery.error}
            emphasis="compact"
          >
            {dashboardQuery.data ? (
              <ul className="grid grid-cols-2 gap-2 text-sm">
                {(
                  [
                    [
                      "Incidents",
                      dashboardQuery.data.modules.incidents?.total,
                      "/incidents",
                    ],
                    [
                      "Audits",
                      dashboardQuery.data.modules.audits?.total,
                      "/audits/internal",
                    ],
                    ["OFI", dashboardQuery.data.modules.ofi?.total, "/ofi"],
                    [
                      "Inventory",
                      dashboardQuery.data.modules.inventory?.totalCount,
                      "/assets/hardware",
                    ],
                    [
                      "Suppliers",
                      dashboardQuery.data.modules.suppliers
                        ? dashboardQuery.data.modules.suppliers
                            .supplierCompliance.compliant +
                          dashboardQuery.data.modules.suppliers
                            .supplierCompliance.inCompliant
                        : null,
                      "/suppliers",
                    ],
                    [
                      "Reviews",
                      dashboardQuery.data.modules.managementReviews?.total,
                      "/management-reviews",
                    ],
                  ] as const
                ).map(([label, value, href]) => (
                  <li key={label}>
                    <Link
                      to={href}
                      className="flex items-baseline justify-between gap-2 rounded-md border border-border-subtle px-3 py-2.5 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                    >
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-semibold tabular-nums">
                        {value == null ? "—" : formatInteger(value)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </DashboardPanel>
        </div>

        <div className="col-span-12 md:col-span-6 lg:col-span-4">
          <DashboardPanel
            title="Continual improvement (OFI)"
            href="/ofi"
            hrefLabel="OFI"
            isLoading={cipStatsQuery.isLoading}
            isError={cipStatsQuery.isError}
            error={cipStatsQuery.error}
            emphasis="compact"
          >
            {cipStatsQuery.data ? (
              cipStatsQuery.data.byBusinessUnit.length === 0 ? (
                <DashboardEmptyState title="No OFI data for business units" />
              ) : (
                <DashboardCategoryBarChart
                  ariaLabel="OFI opportunities by business unit"
                  height={200}
                  items={cipStatsQuery.data.byBusinessUnit.map((row) => ({
                    label: row.name,
                    value: row.opportunities,
                    hint: `${formatInteger(row.improvements)} implemented`,
                  }))}
                />
              )
            ) : null}
          </DashboardPanel>
        </div>

        <div className="col-span-12 md:col-span-6 lg:col-span-4">
          <DashboardPanel
            title="Suppliers"
            href="/suppliers"
            hrefLabel="Suppliers"
            isLoading={supplierStatsQuery.isLoading}
            isError={supplierStatsQuery.isError}
            error={supplierStatsQuery.error}
            emphasis="compact"
          >
            {supplierStatsQuery.data ? (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-md border border-border-subtle bg-surface-muted/25 px-3 py-3">
                    <p className="text-[0.6875rem] text-muted-foreground">
                      Procurement value
                    </p>
                    <p className="mt-1 text-lg font-semibold tabular-nums">
                      {formatCurrency(supplierStatsQuery.data.procurementValue)}
                    </p>
                  </div>
                  <div className="rounded-md border border-border-subtle bg-surface-muted/25 px-3 py-3">
                    <p className="text-[0.6875rem] text-muted-foreground">
                      Compliance
                    </p>
                    <p className="mt-1 text-lg font-semibold tabular-nums">
                      {formatInteger(
                        supplierStatsQuery.data.supplierCompliance.percentage
                      )}
                      %
                    </p>
                    <p className="text-[0.6875rem] text-muted-foreground">
                      Risk level:{" "}
                      {supplierStatsQuery.data.supplierCompliance.riskLevel}
                    </p>
                  </div>
                </div>
                <p className="text-muted-foreground">
                  Supplier incidents:{" "}
                  <span className="font-medium text-foreground tabular-nums">
                    {formatInteger(
                      supplierStatsQuery.data.supplierIncidents.totalIncidents
                    )}
                  </span>{" "}
                  (
                  {formatInteger(
                    supplierStatsQuery.data.supplierIncidents.openIncidents
                  )}{" "}
                  open ·{" "}
                  {formatInteger(
                    supplierStatsQuery.data.supplierIncidents.resolvedIncidents
                  )}{" "}
                  resolved)
                </p>
              </div>
            ) : null}
          </DashboardPanel>
        </div>
      </div>

      {/* Bento — commercial + assets */}
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 lg:col-span-5">
          <DashboardPanel
            title="Inventory"
            href="/assets/hardware"
            hrefLabel="Inventory"
            isLoading={inventoryStatsQuery.isLoading}
            isError={inventoryStatsQuery.isError}
            error={inventoryStatsQuery.error}
            emphasis="compact"
          >
            {inventoryStatsQuery.data ? (
              <DashboardBarList
                ariaLabel="Asset counts by area"
                items={inventoryStatsQuery.data.areas.map((area, index) => ({
                  label: area,
                  value: inventoryStatsQuery.data.amounts[index] ?? 0,
                  hint: formatCurrency(
                    inventoryStatsQuery.data.costs[index] ?? 0
                  ),
                }))}
              />
            ) : null}
          </DashboardPanel>
        </div>

        <div className="col-span-12 lg:col-span-7">
          <DashboardPanel
            title="CRM"
            href="/customers"
            hrefLabel="Customers"
            isLoading={crmStatsQuery.isLoading}
            isError={crmStatsQuery.isError}
            error={crmStatsQuery.error}
          >
            {crmStatsQuery.data ? (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-md border border-border-subtle bg-surface-muted/25 px-3 py-3">
                    <p className="text-[0.6875rem] text-muted-foreground">
                      Total contract value
                    </p>
                    <p className="mt-1 text-lg font-semibold tabular-nums">
                      {formatCurrency(crmStatsQuery.data.totalContractValue)}
                    </p>
                  </div>
                  <div className="rounded-md border border-border-subtle bg-surface-muted/25 px-3 py-3">
                    <p className="text-[0.6875rem] text-muted-foreground">
                      Average
                    </p>
                    <p className="mt-1 text-lg font-semibold tabular-nums">
                      {formatCurrency(crmStatsQuery.data.averageContractValue)}
                    </p>
                  </div>
                </div>
                <DashboardCategoryBarChart
                  ariaLabel="Contract value by stage"
                  emptyTitle="No customers in sample"
                  height={180}
                  valueFormat="currency"
                  items={crmStatsQuery.data.byStage.map((row) => ({
                    label: row.stage,
                    value: row.contractValue,
                    hint: `${formatInteger(row.count)} customers`,
                  }))}
                />
                <div className="border-t border-border-subtle pt-3">
                  <p className="mb-2 text-[0.75rem] font-medium text-muted-foreground">
                    Invoices (last 12 months)
                  </p>
                  {crmStatsQuery.data.invoicesUnavailable ? (
                    <DashboardUnavailableState
                      title="Invoice statistics unavailable"
                      description="The Invoices capability is not available in V5 yet. Contract values above are still live from Customers."
                    />
                  ) : (
                    <DashboardSeriesChart
                      ariaLabel="Invoice amounts by month"
                      height={160}
                      months={crmStatsQuery.data.invoicesByMonth.map(
                        (row) => row.label
                      )}
                      series={{
                        Amount: crmStatsQuery.data.invoicesByMonth.map(
                          (row) => row.amount
                        ),
                      }}
                    />
                  )}
                </div>
              </div>
            ) : null}
          </DashboardPanel>
        </div>
      </div>

      {/* Bento — maturity + compliance (lower priority) */}
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 lg:col-span-7">
          <DashboardPanel
            title="Digital maturity"
            description="Utilisation by internal business unit across core modules."
            href="/functional-units"
            hrefLabel="Functional units"
            isLoading={maturityQuery.isLoading}
            isError={maturityQuery.isError}
            error={maturityQuery.error}
            emphasis="compact"
          >
            {maturityQuery.data ? (
              maturityQuery.data.businessUnitMaturity.length === 0 ? (
                <DashboardEmptyState
                  title="No internal business units"
                  description="Digital maturity is calculated for internal business functions only."
                />
              ) : (
                <ul className="space-y-5" aria-label="Digital maturity by unit">
                  {maturityQuery.data.businessUnitMaturity.map((unit) => (
                    <li key={unit.functionalUnitId} className="space-y-2.5">
                      <p className="text-sm font-medium">{unit.name}</p>
                      <ul className="space-y-2">
                        {unit.modules.map((mod) => (
                          <li key={mod.key} className="space-y-1">
                            <div className="flex justify-between gap-2 text-[0.75rem]">
                              <span className="text-muted-foreground">
                                {mod.label}
                              </span>
                              <span className="tabular-nums">
                                Score {mod.score} · {mod.utilisationPercentage}%
                              </span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-sm bg-surface-muted">
                              <div
                                className="h-full rounded-sm bg-info/70"
                                style={{
                                  width: `${Math.min(100, mod.utilisationPercentage)}%`,
                                }}
                              />
                            </div>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              )
            ) : null}
          </DashboardPanel>
        </div>

        <div className="col-span-12 lg:col-span-5">
          <DashboardPanel
            title="Compliance"
            description="Framework completion percentages."
            isLoading={complianceQuery.isLoading}
            isError={complianceQuery.isError}
            error={complianceQuery.error}
            emphasis="compact"
          >
            {complianceQuery.data?.unavailable ? (
              <DashboardUnavailableState
                title="Compliance statistics unavailable"
                description="Compliance overview could not be loaded for this organisation."
              />
            ) : complianceQuery.data ? (
              complianceQuery.data.frameworks.length === 0 ? (
                <DashboardEmptyState
                  title="No compliance frameworks"
                  description="Activate a licensed toolkit from Compliance to track progress."
                />
              ) : (
                <div className="space-y-3">
                  <DashboardBarList
                    ariaLabel="Compliance completion by framework"
                    items={complianceQuery.data.frameworks.map((row) => ({
                      label: row.name,
                      value: row.totalPercentage,
                    }))}
                  />
                  <Link
                    to="/compliance"
                    className="inline-flex text-xs font-medium text-primary hover:underline"
                  >
                    Open Compliance
                  </Link>
                </div>
              )
            ) : null}
          </DashboardPanel>
        </div>
      </div>
    </div>
  );
}
