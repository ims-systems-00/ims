import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEV_STUB_IDENTITY, type Authorizer } from "../src/security";
import { ForbiddenError, UnauthorizedError } from "../src/shared";
import { DevZeroStatsPorts } from "../src/modules/stats/ports";
import { createStatsService } from "../src/modules/stats/services/stats.service";
import {
  deriveOrganisationalConfidence,
  deriveOrganisationalState,
  maturityScoreFromUtilisation,
  supplierRiskLevel,
} from "../src/modules/stats/services/calculations";
import {
  resolveRiskStatsWindow,
  resolveStatsDateRange,
} from "../src/modules/stats/services/date-range";
import type { Risk } from "../src/modules/risks";

describe("stats calculations", () => {
  it("derives organisational state from mitigation ratio", () => {
    expect(deriveOrganisationalState(0, 0)).toBe("Safe");
    expect(deriveOrganisationalState(10, 9)).toBe("Safe");
    expect(deriveOrganisationalState(10, 7)).toBe("Secure");
    expect(deriveOrganisationalState(10, 5)).toBe("Unsecure");
    expect(deriveOrganisationalState(10, 3)).toBe("Vulnerable");
    expect(deriveOrganisationalState(10, 1)).toBe("Hazardous");
  });

  it("derives confidence as presence points / 5", () => {
    expect(
      deriveOrganisationalConfidence({
        hasAssets: false,
        hasRisks: false,
        hasAudits: false,
        hasCompletedAudits: false,
        hasCompletedManagementReviews: false,
      })
    ).toBe(0);
    expect(
      deriveOrganisationalConfidence({
        hasAssets: true,
        hasRisks: true,
        hasAudits: true,
        hasCompletedAudits: true,
        hasCompletedManagementReviews: true,
      })
    ).toBe(100);
  });

  it("maps utilisation to maturity scores", () => {
    expect(maturityScoreFromUtilisation(0, 0)).toBe(1);
    expect(maturityScoreFromUtilisation(1, 0)).toBe(2);
    expect(maturityScoreFromUtilisation(1, 50)).toBe(3);
    expect(maturityScoreFromUtilisation(1, 100)).toBe(4);
  });

  it("maps supplier compliance percentage to risk level", () => {
    expect(supplierRiskLevel(10)).toBe("Hazardous");
    expect(supplierRiskLevel(30)).toBe("Vulnerable");
    expect(supplierRiskLevel(50)).toBe("Unsecure");
    expect(supplierRiskLevel(70)).toBe("Secure");
    expect(supplierRiskLevel(90)).toBe("Safe");
  });
});

describe("stats date-range helpers", () => {
  it("defaults to V4 fixed window when query omitted", () => {
    const range = resolveStatsDateRange({});
    expect(range.startDate.getFullYear()).toBe(2022);
    expect(range.endDate.getFullYear()).toBe(2027);
  });

  it("rejects inverted ranges only at schema layer; helper accepts explicit bounds", () => {
    const range = resolveStatsDateRange({
      startDate: "2026-01-01T00:00:00.000Z",
      endDate: "2026-12-31T23:59:59.999Z",
    });
    expect(range.startDate.toISOString()).toContain("2026-01-01");
    expect(range.endDate.toISOString()).toContain("2026-12-31");
  });

  it("builds risk month window of requested length ending this month", () => {
    const { monthMeta, startDate, endDate } = resolveRiskStatsWindow(3);
    expect(monthMeta).toHaveLength(3);
    expect(startDate.getDate()).toBe(1);
    expect(endDate.getTime()).toBeLessThanOrEqual(Date.now() + 1000);
  });
});

describe("StatsService", () => {
  let authorizer: Authorizer;
  let ports: DevZeroStatsPorts;
  let service: ReturnType<typeof createStatsService>;

  beforeEach(() => {
    authorizer = { allow: vi.fn().mockResolvedValue(true) };
    ports = new DevZeroStatsPorts();
    service = createStatsService({ authorizer, ports });
  });

  it("rejects unauthenticated access", async () => {
    await expect(service.globalStats(null)).rejects.toBeInstanceOf(
      UnauthorizedError
    );
  });

  it("rejects forbidden access", async () => {
    vi.mocked(authorizer.allow).mockResolvedValue(false);
    await expect(
      service.globalStats(DEV_STUB_IDENTITY)
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("returns empty global stats with Safe state and zero confidence", async () => {
    const result = await service.globalStats(DEV_STUB_IDENTITY);
    expect(result.organizationalConfidence).toBe(0);
    expect(result.organizationalState).toBe("Safe");
    expect(result.criticalArea).toBe("No Critical Area");
    expect(result.businessUnit).toBe(0);
    expect(result.incidentResolutionTimes).toHaveLength(4);
    expect(authorizer.allow).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "read",
        resourceType: "stats",
      })
    );
  });

  it("computes confidence, state, and critical area from port data", async () => {
    ports.inventory.stats = async () => ({
      categories: [],
      totalCount: 2,
      totalCost: 0,
    });
    ports.risks.stats = async () => ({
      total: 10,
      open: 2,
      escalated: 0,
      mitigated: 9,
      accepted: 0,
      byScoreBand: { low: 0, medium: 10, high: 0 },
    });
    ports.audits.stats = async () => ({
      total: 1,
      scheduled: 0,
      completed: 1,
      upcoming: 0,
      byType: { Internal: 1, External: 0 },
    });
    ports.managementReviews.stats = async () => ({
      total: 1,
      scheduled: 0,
      completed: 1,
      upcoming: 0,
    });
    ports.risks.listSample = async () =>
      [
        {
          id: "1",
          type: "Hardware",
          displayStatus: "Open",
          raisedOn: new Date(),
          businessUnitId: "bu1",
        },
        {
          id: "2",
          type: "Hardware",
          displayStatus: "Open",
          raisedOn: new Date(),
          businessUnitId: "bu1",
        },
        {
          id: "3",
          type: "People",
          displayStatus: "Open",
          raisedOn: new Date(),
        },
      ] as unknown as Risk[];

    const raised = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const resolvedOn = new Date();
    ports.incidents.listSample = async () => [
      {
        id: "i1",
        priority: "P1",
        resolved: { status: true },
        raisedOn: raised,
        resolvedOn,
      },
    ];
    ports.organisation.incidentResolutionTargets = async () => ({
      P1: 1,
      P2: null,
      P3: null,
      P4: null,
    });

    const result = await service.globalStats(DEV_STUB_IDENTITY);
    expect(result.organizationalConfidence).toBe(100);
    expect(result.organizationalState).toBe("Safe");
    expect(result.criticalArea).toBe("Hardware");
    const p1 = result.incidentResolutionTimes.find((r) => r.priority === "P1");
    expect(p1?.count).toBe(1);
    expect(p1?.averageHours).toBeGreaterThan(0);
    expect(p1?.alert).toBe(true);
  });

  it("maps Premise/Organisational risk types onto Spec chart labels", async () => {
    const now = new Date();
    ports.risks.listSample = async () =>
      [
        {
          id: "1",
          type: "Premise",
          displayStatus: "Open",
          raisedOn: now,
          businessUnitId: "bu1",
        },
        {
          id: "2",
          type: "Organisational",
          displayStatus: "Mitigated",
          raisedOn: now,
          businessUnitId: "bu1",
        },
      ] as unknown as Risk[];

    const result = await service.riskStats(DEV_STUB_IDENTITY, { months: 1 });
    expect(result.byType.series.Premises?.some((n) => n > 0)).toBe(true);
    expect(result.byType.series.Organisation?.some((n) => n > 0)).toBe(true);
    expect(result.byStatus.series.Open?.some((n) => n > 0)).toBe(true);
    expect(result.byStatus.series.Mitigated?.some((n) => n > 0)).toBe(true);
  });

  it("groups incidents by business unit and counts resolved", async () => {
    ports.incidents.listSample = async () => [
      {
        id: "1",
        businessUnitId: "bu1",
        resolved: { status: true },
        raisedOn: new Date(),
        priority: "P2",
        resolvedOn: new Date(),
      },
      {
        id: "2",
        businessUnitId: "bu1",
        resolved: { status: false },
        raisedOn: new Date(),
        priority: "P2",
        resolvedOn: null,
      },
      {
        id: "3",
        resolved: { status: false },
        raisedOn: new Date(),
        priority: "P3",
        resolvedOn: null,
      },
    ];
    ports.functionalUnits.resolveNames = async () =>
      new Map([["bu1", "Operations"]]);

    const result = await service.incidentStats(DEV_STUB_IDENTITY);
    expect(result.byBusinessFunction).toEqual([
      {
        businessUnitId: "bu1",
        name: "Operations",
        total: 2,
        resolved: 1,
      },
    ]);
  });

  it("returns compliance unavailable when compliance port is stubbed", async () => {
    const result = await service.complianceStats(DEV_STUB_IDENTITY);
    expect(result.unavailable).toBe(true);
    expect(result.frameworks).toEqual([]);
  });

  it("returns crm invoice unavailable when invoices port returns empty", async () => {
    ports.customers.listSample = async () => [
      {
        id: "c1",
        name: "Acme",
        stage: "Live",
        contractValue: 1000,
      },
      {
        id: "c2",
        name: "Beta",
        stage: "Prospect",
        contractValue: 200,
      },
    ];
    const result = await service.crmStats(DEV_STUB_IDENTITY);
    expect(result.totalContractValue).toBe(1200);
    expect(result.averageContractValue).toBe(600);
    expect(result.highest.name).toBe("Acme");
    expect(result.lowest.name).toBe("Beta");
    expect(result.invoicesUnavailable).toBe(true);
    expect(result.invoicesByMonth).toHaveLength(12);
  });

  it("builds inventory amounts/costs including people salaries", async () => {
    ports.inventory.stats = async () => ({
      categories: [
        { category: "hardware", count: 2, totalCost: 500 },
        { category: "software", count: 1, totalCost: 100 },
        { category: "people", count: 3, totalCost: 0 },
        { category: "premise", count: 1, totalCost: 50 },
        { category: "information", count: 4, totalCost: 25 },
      ],
      totalCount: 11,
      totalCost: 675,
    });
    ports.users.sumStaffSalaries = async () => 9000;

    const result = await service.inventoryStats(DEV_STUB_IDENTITY);
    expect(result.areas).toEqual([
      "Hardware",
      "Software",
      "People",
      "Premises",
      "Information",
    ]);
    expect(result.amounts).toEqual([2, 1, 3, 1, 4]);
    expect(result.costs).toEqual([500, 100, 9000, 50, 25]);
  });

  it("counts CIP opportunities and implemented improvements by BU", async () => {
    ports.ofi.listSample = async () => [
      {
        id: "1",
        businessUnitId: "bu1",
        implemented: { status: "Implemented" },
      },
      {
        id: "2",
        businessUnitId: "bu1",
        implemented: { status: "Pending" },
      },
    ];
    ports.functionalUnits.resolveNames = async () =>
      new Map([["bu1", "Ops"]]);

    const result = await service.cipStats(DEV_STUB_IDENTITY);
    expect(result.byBusinessUnit).toEqual([
      {
        businessUnitId: "bu1",
        name: "Ops",
        opportunities: 2,
        improvements: 1,
      },
    ]);
  });

  it("builds digital maturity for internal BUs only", async () => {
    ports.functionalUnits.listBusinessUnits = async () => [
      {
        id: "bu1",
        name: "Internal",
        accessType: "Internal business function",
      },
      {
        id: "bu2",
        name: "External",
        accessType: "External function",
      },
    ];
    ports.risks.listSample = async () =>
      [{ id: "r1", businessUnitId: "bu1" }] as unknown as Risk[];

    const result = await service.digitalMaturityStats(DEV_STUB_IDENTITY);
    expect(result.businessUnitMaturity).toHaveLength(1);
    expect(result.businessUnitMaturity[0]!.functionalUnitId).toBe("bu1");
    const riskMod = result.businessUnitMaturity[0]!.modules.find(
      (m) => m.key === "risk"
    );
    expect(riskMod?.utilisationPercentage).toBe(100);
    expect(riskMod?.score).toBe(4);
    const docMod = result.businessUnitMaturity[0]!.modules.find(
      (m) => m.key === "document"
    );
    expect(docMod?.utilisationPercentage).toBe(0);
  });
});
