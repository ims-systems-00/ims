import { Link } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { StatusBadge } from "@/shared/components/status-badge";
import { PageHeader } from "@/shared/layout";
import { isApiClientError } from "@/shared/lib/http/errors";
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
import { DashboardKpiCard } from "../components/dashboard-kpi-card";
import {
  DashboardBarList,
  DashboardSeriesChart,
} from "../components/dashboard-charts";
import {
  DashboardEmptyState,
  DashboardPanel,
  DashboardUnavailableState,
} from "../components/dashboard-panel";

/**
 * Organisation Live Dashboard Phase 1.
 * Primary: GET /dashboard/organisation
 * Panels: independent GET /stats/* queries
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
    <div className="space-y-5">
      <PageHeader
        title="Organisation Live Dashboard"
        description="Live operational overview for the current organisation. Metrics refresh on demand from Dashboard and Stats APIs."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {accurateAs ? (
              <span className="text-[0.75rem] text-muted-foreground">
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
          className="grid grid-cols-2 gap-3 lg:grid-cols-4"
          aria-busy="true"
          aria-label="Loading summary cards"
        >
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-[5.5rem] animate-pulse rounded-md border border-border bg-surface-muted"
            />
          ))}
        </div>
      ) : null}

      {dashboardQuery.isSuccess ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {organisationalState ? (
              <StatusBadge tone={organisationalStateTone(organisationalState)}>
                State: {organisationalState}
              </StatusBadge>
            ) : null}
            {confidence != null ? (
              <StatusBadge tone="info">
                Confidence: {formatInteger(confidence)}%
              </StatusBadge>
            ) : null}
            {criticalArea ? (
              <StatusBadge
                tone={
                  criticalArea === "No Critical Area" ? "neutral" : "warning"
                }
              >
                Critical area: {criticalArea}
              </StatusBadge>
            ) : globalStatsQuery.isSuccess ? null : (
              <StatusBadge tone="neutral">Critical area: loading…</StatusBadge>
            )}
          </div>

          <div
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
            role="group"
            aria-label="Organisation summary"
          >
            <DashboardKpiCard
              label="Staff"
              value={formatInteger(dashboardQuery.data.counts.staff)}
              hint={`${formatInteger(dashboardQuery.data.counts.remoteStaff)} remote`}
              href="/users"
            />
            <DashboardKpiCard
              label="Business units"
              value={formatInteger(dashboardQuery.data.counts.businessUnits)}
              href="/functional-units"
            />
            <DashboardKpiCard
              label="Compliance bodies"
              value={formatInteger(dashboardQuery.data.counts.complianceBodies)}
              href="/functional-units"
            />
            <DashboardKpiCard
              label="Premises"
              value={formatInteger(dashboardQuery.data.counts.premises)}
              href="/business-premises"
            />
            <DashboardKpiCard
              label="Open tasks"
              value={formatInteger(dashboardQuery.data.counts.openTasks)}
              href="/tasks"
            />
            <DashboardKpiCard
              label="Risks"
              value={formatInteger(dashboardQuery.data.modules.risks?.total ?? 0)}
              hint={
                dashboardQuery.data.unavailable.includes("risks")
                  ? "Unavailable"
                  : `${formatInteger(dashboardQuery.data.modules.risks?.open ?? 0)} open`
              }
              href="/risks"
            />
          </div>

          {dashboardQuery.data.unavailable.length > 0 ? (
            <p className="text-[0.75rem] text-muted-foreground">
              Some module summaries were unavailable during aggregation:{" "}
              {dashboardQuery.data.unavailable.join(", ")}.
            </p>
          ) : null}
        </>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardPanel
          title="Incident resolution"
          description="Average resolution time by priority (from Stats global)."
          href="/incidents"
          hrefLabel="Incidents"
          isLoading={globalStatsQuery.isLoading}
          isError={globalStatsQuery.isError}
          error={globalStatsQuery.error}
        >
          {globalStatsQuery.data ? (
            <ul className="space-y-2" aria-label="Resolution times by priority">
              {globalStatsQuery.data.incidentResolutionTimes.map((row) => (
                <li
                  key={row.priority}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border-subtle px-3 py-2 text-sm"
                >
                  <span className="font-medium">{row.priority}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {formatHours(row.averageHours)} · {formatInteger(row.count)}{" "}
                    resolved
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

        <DashboardPanel
          title="Module snapshot"
          description="Counts from the Dashboard aggregation."
          isLoading={dashboardQuery.isLoading}
          isError={dashboardQuery.isError}
          error={dashboardQuery.error}
        >
          {dashboardQuery.data ? (
            <ul className="grid grid-cols-2 gap-2 text-sm">
              {(
                [
                  ["Incidents", dashboardQuery.data.modules.incidents?.total, "/incidents"],
                  ["Audits", dashboardQuery.data.modules.audits?.total, "/audits/internal"],
                  ["OFI", dashboardQuery.data.modules.ofi?.total, "/ofi"],
                  [
                    "Inventory",
                    dashboardQuery.data.modules.inventory?.totalCount,
                    "/assets/hardware",
                  ],
                  [
                    "Suppliers",
                    dashboardQuery.data.modules.suppliers
                      ? dashboardQuery.data.modules.suppliers.supplierCompliance
                          .compliant +
                        dashboardQuery.data.modules.suppliers.supplierCompliance
                          .inCompliant
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
                    className="flex items-baseline justify-between gap-2 rounded-md border border-border-subtle px-3 py-2 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
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

      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardPanel
          title="Risk trends"
          description="Risks by type over the last 12 months."
          href="/risks"
          hrefLabel="Risks"
          isLoading={riskStatsQuery.isLoading}
          isError={riskStatsQuery.isError}
          error={riskStatsQuery.error}
        >
          {riskStatsQuery.data ? (
            <DashboardSeriesChart
              months={riskStatsQuery.data.byType.months}
              series={riskStatsQuery.data.byType.series}
              ariaLabel="Risk counts by type per month"
            />
          ) : null}
        </DashboardPanel>

        <DashboardPanel
          title="Risk status"
          description="Open, mitigated, accepted, and escalated over time."
          href="/risks"
          hrefLabel="Risks"
          isLoading={riskStatsQuery.isLoading}
          isError={riskStatsQuery.isError}
          error={riskStatsQuery.error}
        >
          {riskStatsQuery.data ? (
            <>
              <DashboardSeriesChart
                months={riskStatsQuery.data.byStatus.months}
                series={riskStatsQuery.data.byStatus.series}
                ariaLabel="Risk counts by status per month"
              />
              <div className="mt-4 border-t border-border-subtle pt-3">
                <p className="mb-2 text-[0.75rem] font-medium text-muted-foreground">
                  Top business functions by risk
                </p>
                <DashboardBarList
                  ariaLabel="Top business units by risk count"
                  emptyTitle="No business-unit risk totals in sample"
                  items={riskStatsQuery.data.topBusinessFunctions.map((row) => ({
                    label: row.name,
                    value: row.total,
                  }))}
                />
              </div>
            </>
          ) : null}
        </DashboardPanel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
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
              <DashboardBarList
                ariaLabel="Incidents by business unit"
                items={incidentStatsQuery.data.byBusinessFunction.map((row) => ({
                  label: row.name,
                  value: row.total,
                  hint: `${formatInteger(row.resolved)} resolved`,
                }))}
              />
            )
          ) : null}
        </DashboardPanel>

        <DashboardPanel
          title="Audits"
          description="Totals and non-conformities by business unit."
          href="/audits/internal"
          hrefLabel="Audits"
          isLoading={auditStatsQuery.isLoading}
          isError={auditStatsQuery.isError}
          error={auditStatsQuery.error}
        >
          {auditStatsQuery.data ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div className="rounded-md border border-border-subtle px-2 py-2">
                  <p className="text-[0.6875rem] text-muted-foreground">Total</p>
                  <p className="text-lg font-semibold tabular-nums">
                    {formatInteger(auditStatsQuery.data.total)}
                  </p>
                </div>
                <div className="rounded-md border border-border-subtle px-2 py-2">
                  <p className="text-[0.6875rem] text-muted-foreground">
                    Scheduled
                  </p>
                  <p className="text-lg font-semibold tabular-nums">
                    {formatInteger(auditStatsQuery.data.scheduled)}
                  </p>
                </div>
                <div className="rounded-md border border-border-subtle px-2 py-2">
                  <p className="text-[0.6875rem] text-muted-foreground">
                    Completed
                  </p>
                  <p className="text-lg font-semibold tabular-nums">
                    {formatInteger(auditStatsQuery.data.completed)}
                  </p>
                </div>
              </div>
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
          ) : null}
        </DashboardPanel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardPanel
          title="Continual improvement (OFI)"
          href="/ofi"
          hrefLabel="OFI"
          isLoading={cipStatsQuery.isLoading}
          isError={cipStatsQuery.isError}
          error={cipStatsQuery.error}
        >
          {cipStatsQuery.data ? (
            cipStatsQuery.data.byBusinessUnit.length === 0 ? (
              <DashboardEmptyState title="No OFI data for business units" />
            ) : (
              <DashboardBarList
                ariaLabel="OFI opportunities by business unit"
                items={cipStatsQuery.data.byBusinessUnit.map((row) => ({
                  label: row.name,
                  value: row.opportunities,
                  hint: `${formatInteger(row.improvements)} implemented`,
                }))}
              />
            )
          ) : null}
        </DashboardPanel>

        <DashboardPanel
          title="Suppliers"
          href="/suppliers"
          hrefLabel="Suppliers"
          isLoading={supplierStatsQuery.isLoading}
          isError={supplierStatsQuery.isError}
          error={supplierStatsQuery.error}
        >
          {supplierStatsQuery.data ? (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-md border border-border-subtle px-3 py-2">
                  <p className="text-[0.6875rem] text-muted-foreground">
                    Procurement value
                  </p>
                  <p className="text-lg font-semibold tabular-nums">
                    {formatCurrency(supplierStatsQuery.data.procurementValue)}
                  </p>
                </div>
                <div className="rounded-md border border-border-subtle px-3 py-2">
                  <p className="text-[0.6875rem] text-muted-foreground">
                    Compliance
                  </p>
                  <p className="text-lg font-semibold tabular-nums">
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

      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardPanel
          title="Inventory"
          href="/assets/hardware"
          hrefLabel="Inventory"
          isLoading={inventoryStatsQuery.isLoading}
          isError={inventoryStatsQuery.isError}
          error={inventoryStatsQuery.error}
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
                <div className="rounded-md border border-border-subtle px-3 py-2">
                  <p className="text-[0.6875rem] text-muted-foreground">
                    Total contract value
                  </p>
                  <p className="text-lg font-semibold tabular-nums">
                    {formatCurrency(crmStatsQuery.data.totalContractValue)}
                  </p>
                </div>
                <div className="rounded-md border border-border-subtle px-3 py-2">
                  <p className="text-[0.6875rem] text-muted-foreground">
                    Average
                  </p>
                  <p className="text-lg font-semibold tabular-nums">
                    {formatCurrency(crmStatsQuery.data.averageContractValue)}
                  </p>
                </div>
              </div>
              <DashboardBarList
                ariaLabel="Contract value by stage"
                emptyTitle="No customers in sample"
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
                  <DashboardBarList
                    ariaLabel="Invoice amounts by month"
                    items={crmStatsQuery.data.invoicesByMonth.map((row) => ({
                      label: row.label,
                      value: row.amount,
                      hint: `${formatInteger(row.count)} sent`,
                    }))}
                  />
                )}
              </div>
            </div>
          ) : null}
        </DashboardPanel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardPanel
          title="Digital maturity"
          description="Utilisation by internal business unit across core modules."
          href="/functional-units"
          hrefLabel="Functional units"
          isLoading={maturityQuery.isLoading}
          isError={maturityQuery.isError}
          error={maturityQuery.error}
        >
          {maturityQuery.data ? (
            maturityQuery.data.businessUnitMaturity.length === 0 ? (
              <DashboardEmptyState
                title="No internal business units"
                description="Digital maturity is calculated for internal business functions only."
              />
            ) : (
              <ul className="space-y-4" aria-label="Digital maturity by unit">
                {maturityQuery.data.businessUnitMaturity.map((unit) => (
                  <li key={unit.functionalUnitId} className="space-y-2">
                    <p className="text-sm font-medium">{unit.name}</p>
                    <ul className="space-y-1.5">
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
                              className="h-full rounded-sm bg-primary/60"
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

        <DashboardPanel
          title="Compliance"
          description="Framework completion percentages."
          isLoading={complianceQuery.isLoading}
          isError={complianceQuery.isError}
          error={complianceQuery.error}
        >
          {complianceQuery.data?.unavailable ? (
            <DashboardUnavailableState
              title="Compliance statistics unavailable"
              description="The Compliance module is not available in V5 yet. This panel will populate when Compliance Overview is implemented."
            />
          ) : complianceQuery.data ? (
            complianceQuery.data.frameworks.length === 0 ? (
              <DashboardEmptyState title="No compliance frameworks" />
            ) : (
              <DashboardBarList
                ariaLabel="Compliance completion by framework"
                items={complianceQuery.data.frameworks.map((row) => ({
                  label: row.name,
                  value: row.totalPercentage,
                }))}
              />
            )
          ) : null}
        </DashboardPanel>
      </div>
    </div>
  );
}
