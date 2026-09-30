/**
 * Stats application service — live organisational analytics.
 * Spec: docs/module-specifications/stats.md
 */

import type { Authorizer, SecurityIdentity } from "../../../security";
import { ForbiddenError, UnauthorizedError } from "../../../shared";
import type { StatsModulePorts } from "../ports";
import {
  STATS_RESOURCE,
  RISK_TYPE_LABELS,
  type AuditStatsResult,
  type CipStatsResult,
  type ComplianceStats,
  type CrmStatsResult,
  type DigitalMaturityStats,
  type GlobalStats,
  type IncidentStatsResult,
  type InventoryStatsResult,
  type MaturityScore,
  type ModuleMaturity,
  type RiskStatsResult,
  type StatsDateQuery,
  type StatsRiskQuery,
  type SupplierStatsResult,
} from "../types";
import {
  deriveOrganisationalConfidence,
  deriveOrganisationalState,
  maturityScoreFromUtilisation,
  supplierRiskLevel,
} from "./calculations";
import {
  last12InvoiceMonths,
  resolveRiskStatsWindow,
  resolveStatsDateRange,
} from "./date-range";

function requireOrgIdentity(identity: SecurityIdentity | null | undefined): {
  identity: SecurityIdentity;
  organizationId: string;
} {
  if (!identity?.subjectId) throw new UnauthorizedError();
  if (!identity.organizationId) {
    throw new ForbiddenError("Organisation context is required");
  }
  return { identity, organizationId: identity.organizationId };
}

const MATURITY_MODULES: Array<{ key: string; label: string }> = [
  { key: "risk", label: "Risk Management" },
  { key: "incident", label: "Incident Management" },
  { key: "supplier", label: "Supplier Management" },
  { key: "document", label: "Document Management" },
  { key: "cip", label: "CIP" },
  { key: "audit", label: "Audits" },
  { key: "inventory", label: "Inventory" },
];

/** Map V5 RiskType values onto Stats/V4 chart labels. */
function toStatsRiskTypeLabel(type: string): string {
  if (type === "Premise") return "Premises";
  if (type === "Organisational") return "Organisation";
  return type;
}

export type StatsServiceDeps = {
  authorizer: Authorizer;
  ports: StatsModulePorts;
};

export type StatsService = ReturnType<typeof createStatsService>;

export function createStatsService(deps: StatsServiceDeps) {
  const { authorizer, ports } = deps;

  async function assertAllowed(identity: SecurityIdentity): Promise<void> {
    const allowed = await authorizer.allow({
      identity,
      action: "read",
      resourceType: STATS_RESOURCE,
      organizationId: identity.organizationId,
    });
    if (!allowed) {
      throw new ForbiddenError(
        "User does not have permission to access Stats"
      );
    }
  }

  return {
    async globalStats(
      identity: SecurityIdentity | null | undefined,
      _query: StatsDateQuery = {}
    ): Promise<GlobalStats> {
      const { identity: actor } = requireOrgIdentity(identity);
      await assertAllowed(actor);
      void _query;

      const [
        risks,
        audits,
        inventory,
        managementReviews,
        businessUnits,
        complianceBodies,
        staff,
        remoteStaff,
        riskSample,
        incidentSample,
        targets,
      ] = await Promise.all([
        ports.risks.stats(actor),
        ports.audits.stats(actor),
        ports.inventory.stats(actor),
        ports.managementReviews.stats(actor),
        ports.functionalUnits.listBusinessUnits(actor),
        ports.functionalUnits.listComplianceBodies(actor),
        ports.users.countActiveStaff(actor),
        ports.users.countRemoteStaff(actor),
        ports.risks.listSample(actor, { pageSize: 100 }),
        ports.incidents.listSample(actor, { pageSize: 100 }),
        ports.organisation.incidentResolutionTargets(actor),
      ]);

      const typeCounts = new Map<string, number>();
      for (const risk of riskSample) {
        const label = toStatsRiskTypeLabel(risk.type);
        typeCounts.set(label, (typeCounts.get(label) ?? 0) + 1);
      }
      let criticalArea = "No Critical Area";
      let max = 0;
      for (const label of RISK_TYPE_LABELS) {
        const count = typeCounts.get(label) ?? 0;
        if (count > max) {
          max = count;
          criticalArea = label;
        }
      }

      const resolutionByPriority: GlobalStats["incidentResolutionTimes"] = (
        ["P1", "P2", "P3", "P4"] as const
      ).map((priority) => {
        const resolved = incidentSample.filter(
          (item) =>
            item.priority === priority &&
            item.resolved.status &&
            item.resolvedOn
        );
        let averageHours: number | null = null;
        if (resolved.length > 0) {
          const totalMs = resolved.reduce((sum, item) => {
            const end = item.resolvedOn!.getTime();
            const start = item.raisedOn.getTime();
            return sum + Math.max(0, end - start);
          }, 0);
          averageHours = totalMs / resolved.length / (1000 * 60 * 60);
        }
        const targetHours = targets[priority];
        const alert =
          averageHours != null &&
          targetHours != null &&
          averageHours >= targetHours;
        return {
          priority,
          averageHours:
            averageHours == null ? null : Math.round(averageHours * 10) / 10,
          count: resolved.length,
          alert,
          targetHours,
        };
      });

      return {
        accurateAs: new Date().toISOString(),
        organizationalConfidence: deriveOrganisationalConfidence({
          hasAssets: inventory.totalCount > 0,
          hasRisks: risks.total > 0,
          hasAudits: audits.total > 0,
          hasCompletedAudits: audits.completed > 0,
          hasCompletedManagementReviews: managementReviews.completed > 0,
        }),
        organizationalState: deriveOrganisationalState(
          risks.total,
          risks.mitigated
        ),
        criticalArea,
        businessUnit: businessUnits.length,
        numberOfStaffs: staff,
        numberOfStaffsRemote: remoteStaff,
        complianceBodies: complianceBodies.length,
        incidentResolutionTimes: resolutionByPriority,
      };
    },

    async digitalMaturityStats(
      identity: SecurityIdentity | null | undefined
    ): Promise<DigitalMaturityStats> {
      const { identity: actor } = requireOrgIdentity(identity);
      await assertAllowed(actor);

      const units = await ports.functionalUnits.listBusinessUnits(actor);
      const internal = units.filter(
        (unit) => unit.accessType === "Internal business function"
      );

      const [risks, incidents, ofis, audits, suppliers, inventory] =
        await Promise.all([
          ports.risks.listSample(actor, { pageSize: 100 }),
          ports.incidents.listSample(actor, { pageSize: 100 }),
          ports.ofi.listSample(actor, { pageSize: 100 }),
          ports.audits.listSample(actor, { pageSize: 100 }),
          ports.suppliers.stats(actor),
          ports.inventory.stats(actor),
        ]);

      const businessUnitMaturity = internal.map((unit) => {
        const hasRisk = risks.some((r) => r.businessUnitId === unit.id);
        const hasIncident = incidents.some(
          (i) => i.businessUnitId === unit.id
        );
        const hasCip = ofis.some((o) => o.businessUnitId === unit.id);
        const hasAudit = audits.some((a) => a.businessUnitId === unit.id);
        const hasSupplier = suppliers.supplierCompliance.compliant > 0;
        const hasInventory = inventory.totalCount > 0;
        // Document Management not implemented — utilisation stays 0.
        const flags: Record<string, boolean> = {
          risk: hasRisk,
          incident: hasIncident,
          supplier: hasSupplier,
          document: false,
          cip: hasCip,
          audit: hasAudit,
          inventory: hasInventory,
        };
        const modules: ModuleMaturity[] = MATURITY_MODULES.map((mod) => {
          const utilisationPercentage = flags[mod.key] ? 100 : 0;
          const score = maturityScoreFromUtilisation(
            1,
            utilisationPercentage
          ) as MaturityScore;
          return {
            key: mod.key,
            label: mod.label,
            score,
            utilisationPercentage,
          };
        });
        return {
          functionalUnitId: unit.id,
          name: unit.name,
          modules,
        };
      });

      const organisationalMaturity: ModuleMaturity[] = MATURITY_MODULES.map(
        (mod) => {
          const scores = businessUnitMaturity.map(
            (bu) => bu.modules.find((m) => m.key === mod.key)?.score ?? 1
          );
          const score = (
            scores.length === 0 ? 1 : Math.min(...scores)
          ) as MaturityScore;
          return {
            key: mod.key,
            label: mod.label,
            score,
            utilisationPercentage: 0,
          };
        }
      );

      return { businessUnitMaturity, organisationalMaturity };
    },

    async complianceStats(
      identity: SecurityIdentity | null | undefined,
      _query: StatsDateQuery = {}
    ): Promise<ComplianceStats> {
      const { identity: actor } = requireOrgIdentity(identity);
      await assertAllowed(actor);
      void _query;
      const frameworks = await ports.compliance.frameworkPercentages(actor);
      if (frameworks == null) {
        return { frameworks: [], unavailable: true };
      }
      return { frameworks, unavailable: false };
    },

    async auditStats(
      identity: SecurityIdentity | null | undefined,
      _query: StatsDateQuery = {}
    ): Promise<AuditStatsResult> {
      const { identity: actor } = requireOrgIdentity(identity);
      await assertAllowed(actor);
      void _query;

      const [stats, sample] = await Promise.all([
        ports.audits.stats(actor),
        ports.audits.listSample(actor, { pageSize: 100 }),
      ]);

      const counts = new Map<string, number>();
      for (const audit of sample) {
        const n = audit.identifications.length;
        if (n === 0) continue;
        counts.set(
          audit.businessUnitId,
          (counts.get(audit.businessUnitId) ?? 0) + n
        );
      }
      const names = await ports.functionalUnits.resolveNames(
        actor,
        [...counts.keys()]
      );
      const nonConformitiesByBusinessUnit = [...counts.entries()].map(
        ([businessUnitId, count]) => ({
          businessUnitId,
          name: names.get(businessUnitId) ?? businessUnitId.slice(0, 8),
          count,
        })
      );

      return {
        total: stats.total,
        scheduled: stats.scheduled,
        completed: stats.completed,
        nonConformitiesByBusinessUnit,
      };
    },

    async riskStats(
      identity: SecurityIdentity | null | undefined,
      query: StatsRiskQuery = {}
    ): Promise<RiskStatsResult> {
      const { identity: actor } = requireOrgIdentity(identity);
      await assertAllowed(actor);
      const months = query.months ?? 12;
      const { startDate, endDate, monthMeta } = resolveRiskStatsWindow(months);

      const sample = await ports.risks.listSample(actor, {
        pageSize: 100,
        raisedFrom: startDate,
        raisedTo: endDate,
      });

      const typeKeys = [...RISK_TYPE_LABELS];
      const statusKeys = ["Open", "Mitigated", "Accepted", "Escalated"] as const;
      const byTypeSeries: Record<string, number[]> = {};
      const byStatusSeries: Record<string, number[]> = {};
      for (const key of typeKeys) {
        byTypeSeries[key] = monthMeta.map(() => 0);
      }
      for (const key of statusKeys) {
        byStatusSeries[key] = monthMeta.map(() => 0);
      }

      const indexFor = (date: Date): number => {
        const y = date.getFullYear();
        const m = date.getMonth() + 1;
        return monthMeta.findIndex((meta) => meta.year === y && meta.month === m);
      };

      const buCounts = new Map<string, number>();
      for (const risk of sample) {
        const idx = indexFor(risk.raisedOn);
        const typeLabel = toStatsRiskTypeLabel(risk.type);
        if (
          idx >= 0 &&
          typeKeys.includes(typeLabel as (typeof typeKeys)[number])
        ) {
          const typeBucket = byTypeSeries[typeLabel];
          if (typeBucket) typeBucket[idx] = (typeBucket[idx] ?? 0) + 1;
        }
        if (idx >= 0) {
          const status = risk.displayStatus;
          const statusBucket = byStatusSeries[status];
          if (statusBucket) {
            statusBucket[idx] = (statusBucket[idx] ?? 0) + 1;
          }
        }
        if (risk.businessUnitId) {
          buCounts.set(
            risk.businessUnitId,
            (buCounts.get(risk.businessUnitId) ?? 0) + 1
          );
        }
      }

      const topIds = [...buCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);
      const names = await ports.functionalUnits.resolveNames(
        actor,
        topIds.map(([id]) => id)
      );

      return {
        months,
        byType: {
          months: monthMeta.map((m) => m.label),
          series: byTypeSeries,
        },
        byStatus: {
          months: monthMeta.map((m) => m.label),
          series: byStatusSeries,
        },
        topBusinessFunctions: topIds.map(([businessUnitId, total]) => ({
          businessUnitId,
          name: names.get(businessUnitId) ?? businessUnitId.slice(0, 8),
          total,
        })),
      };
    },

    async incidentStats(
      identity: SecurityIdentity | null | undefined,
      _query: StatsDateQuery = {}
    ): Promise<IncidentStatsResult> {
      const { identity: actor } = requireOrgIdentity(identity);
      await assertAllowed(actor);
      void resolveStatsDateRange(_query);

      const sample = await ports.incidents.listSample(actor, {
        pageSize: 100,
      });
      const totals = new Map<string, { total: number; resolved: number }>();
      for (const incident of sample) {
        const bu = incident.businessUnitId;
        if (!bu) continue;
        const current = totals.get(bu) ?? { total: 0, resolved: 0 };
        current.total += 1;
        if (incident.resolved.status) current.resolved += 1;
        totals.set(bu, current);
      }
      const names = await ports.functionalUnits.resolveNames(
        actor,
        [...totals.keys()]
      );
      return {
        byBusinessFunction: [...totals.entries()].map(
          ([businessUnitId, counts]) => ({
            businessUnitId,
            name: names.get(businessUnitId) ?? businessUnitId.slice(0, 8),
            total: counts.total,
            resolved: counts.resolved,
          })
        ),
      };
    },

    async inventoryStats(
      identity: SecurityIdentity | null | undefined,
      _query: StatsDateQuery = {}
    ): Promise<InventoryStatsResult> {
      const { identity: actor } = requireOrgIdentity(identity);
      await assertAllowed(actor);
      void _query;

      const [inventory, peopleSalaries] = await Promise.all([
        ports.inventory.stats(actor),
        ports.users.sumStaffSalaries(actor),
      ]);

      const areas = [
        "Hardware",
        "Software",
        "People",
        "Premises",
        "Information",
      ];
      const byCategory = new Map(
        inventory.categories.map((c) => [c.category, c])
      );
      const amounts = areas.map((area) => {
        if (area === "People") {
          return byCategory.get("people")?.count ?? 0;
        }
        const key = area.toLowerCase() as
          | "hardware"
          | "software"
          | "premise"
          | "information";
        const mapped =
          area === "Premises" ? byCategory.get("premise") : byCategory.get(key);
        return mapped?.count ?? 0;
      });
      const costs = areas.map((area) => {
        if (area === "People") return peopleSalaries;
        const key =
          area === "Premises"
            ? "premise"
            : (area.toLowerCase() as "hardware" | "software" | "information");
        return byCategory.get(key)?.totalCost ?? 0;
      });

      return { amounts, areas, costs };
    },

    async supplierStats(
      identity: SecurityIdentity | null | undefined,
      _query: StatsDateQuery = {}
    ): Promise<SupplierStatsResult> {
      const { identity: actor } = requireOrgIdentity(identity);
      await assertAllowed(actor);
      void _query;
      const stats = await ports.suppliers.stats(actor);
      return {
        procurementValue: stats.procurementValue,
        supplierIncidents: stats.supplierIncidents,
        supplierCompliance: {
          compliant: stats.supplierCompliance.compliant,
          inCompliant: stats.supplierCompliance.inCompliant,
          percentage: stats.supplierCompliance.percentage,
          riskLevel: supplierRiskLevel(stats.supplierCompliance.percentage),
        },
      };
    },

    async cipStats(
      identity: SecurityIdentity | null | undefined,
      _query: StatsDateQuery = {}
    ): Promise<CipStatsResult> {
      const { identity: actor } = requireOrgIdentity(identity);
      await assertAllowed(actor);
      void _query;

      const sample = await ports.ofi.listSample(actor, { pageSize: 100 });
      const totals = new Map<
        string,
        { opportunities: number; improvements: number }
      >();
      for (const ofi of sample) {
        const current = totals.get(ofi.businessUnitId) ?? {
          opportunities: 0,
          improvements: 0,
        };
        current.opportunities += 1;
        if (ofi.implemented.status === "Implemented") {
          current.improvements += 1;
        }
        totals.set(ofi.businessUnitId, current);
      }
      const names = await ports.functionalUnits.resolveNames(
        actor,
        [...totals.keys()]
      );
      return {
        byBusinessUnit: [...totals.entries()].map(([businessUnitId, counts]) => ({
          businessUnitId,
          name: names.get(businessUnitId) ?? businessUnitId.slice(0, 8),
          opportunities: counts.opportunities,
          improvements: counts.improvements,
        })),
      };
    },

    async crmStats(
      identity: SecurityIdentity | null | undefined,
      _query: StatsDateQuery = {}
    ): Promise<CrmStatsResult> {
      const { identity: actor } = requireOrgIdentity(identity);
      await assertAllowed(actor);
      void _query;

      const [customers, invoices] = await Promise.all([
        ports.customers.listSample(actor, { pageSize: 100 }),
        ports.invoices.monthlySentLast12Months(actor),
      ]);

      const values = customers.map((c) => c.contractValue);
      const totalContractValue = values.reduce((a, b) => a + b, 0);
      const averageContractValue =
        values.length === 0
          ? 0
          : Math.round((totalContractValue / values.length) * 100) / 100;

      let highest = { name: "Not available", value: 0, stage: "" };
      let lowest = { name: "Not available", value: 0, stage: "" };
      if (customers.length > 0) {
        const sorted = [...customers].sort(
          (a, b) => b.contractValue - a.contractValue
        );
        const hi = sorted[0]!;
        const lo = sorted[sorted.length - 1]!;
        highest = { name: hi.name, value: hi.contractValue, stage: hi.stage };
        lowest = { name: lo.name, value: lo.contractValue, stage: lo.stage };
      }

      const stageMap = new Map<string, { count: number; contractValue: number }>();
      for (const customer of customers) {
        const current = stageMap.get(customer.stage) ?? {
          count: 0,
          contractValue: 0,
        };
        current.count += 1;
        current.contractValue += customer.contractValue;
        stageMap.set(customer.stage, current);
      }

      const monthTemplate = last12InvoiceMonths();
      const invoicesByMonth =
        invoices.length > 0
          ? invoices
          : monthTemplate.map((m) => ({
              year: m.year,
              month: m.month,
              label: m.label,
              count: 0,
              amount: 0,
            }));

      return {
        totalContractValue,
        averageContractValue,
        highest,
        lowest,
        byStage: [...stageMap.entries()].map(([stage, data]) => ({
          stage,
          count: data.count,
          contractValue: data.contractValue,
        })),
        invoicesByMonth,
        invoicesUnavailable: invoices.length === 0,
      };
    },
  };
}
