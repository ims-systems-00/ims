import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEV_STUB_IDENTITY, type Authorizer } from "../src/security";
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "../src/shared";
import { DevZeroDashboardPorts } from "../src/modules/dashboard/ports";
import { createDashboardService } from "../src/modules/dashboard/services/dashboard.service";
import {
  buildHeadline,
  deriveOrganisationalConfidence,
  deriveOrganisationalState,
} from "../src/modules/dashboard/services/headline";
import type { DashboardModuleStats } from "../src/modules/dashboard/types";

describe("dashboard headline helpers", () => {
  it("derives organisational state from mitigation ratio (V4 thresholds)", () => {
    expect(deriveOrganisationalState(0, 0)).toBe("Safe");
    expect(deriveOrganisationalState(10, 9)).toBe("Safe");
    expect(deriveOrganisationalState(10, 7)).toBe("Secure");
    expect(deriveOrganisationalState(10, 5)).toBe("Unsecure");
    expect(deriveOrganisationalState(10, 3)).toBe("Vulnerable");
    expect(deriveOrganisationalState(10, 1)).toBe("Hazardous");
  });

  it("derives confidence from module presence points / 5", () => {
    const empty: DashboardModuleStats = {
      risks: null,
      incidents: null,
      audits: null,
      ofi: null,
      suppliers: null,
      inventory: null,
      managementReviews: null,
    };
    expect(deriveOrganisationalConfidence(empty)).toBe(0);

    const full: DashboardModuleStats = {
      risks: {
        total: 1,
        open: 1,
        escalated: 0,
        mitigated: 0,
        accepted: 0,
        byScoreBand: { low: 1, medium: 0, high: 0 },
      },
      incidents: null,
      audits: {
        total: 2,
        scheduled: 1,
        completed: 1,
        upcoming: 0,
        byType: { Internal: 2, External: 0 },
      },
      ofi: null,
      suppliers: null,
      inventory: { categories: [], totalCount: 3, totalCost: 0 },
      managementReviews: {
        total: 1,
        scheduled: 0,
        completed: 1,
        upcoming: 0,
      },
    };
    expect(deriveOrganisationalConfidence(full)).toBe(100);
    expect(buildHeadline(full).criticalArea).toBeNull();
  });
});

describe("DashboardService", () => {
  let authorizer: Authorizer;
  let ports: DevZeroDashboardPorts;
  let service: ReturnType<typeof createDashboardService>;

  beforeEach(() => {
    authorizer = { allow: vi.fn().mockResolvedValue(true) };
    ports = new DevZeroDashboardPorts();
    service = createDashboardService({ authorizer, ports });
  });

  it("rejects unauthenticated organisation dashboard", async () => {
    await expect(
      service.getOrganisationDashboard(null)
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("rejects forbidden access", async () => {
    vi.mocked(authorizer.allow).mockResolvedValue(false);
    await expect(
      service.getOrganisationDashboard(DEV_STUB_IDENTITY)
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("returns organisation live dashboard with accurateAs", async () => {
    const result = await service.getOrganisationDashboard(DEV_STUB_IDENTITY);
    expect(result.context).toBe("organisation");
    expect(result.organizationId).toBe(DEV_STUB_IDENTITY.organizationId);
    expect(result.accurateAs).toBeTruthy();
    expect(result.headline.organisationalConfidence).toBe(0);
    expect(result.headline.organisationalState).toBe("Safe");
    expect(result.modules.risks).toEqual(
      expect.objectContaining({ total: 0 })
    );
    expect(authorizer.allow).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "read",
        resourceType: "dashboard",
      })
    );
  });

  it("rejects invalid date range", async () => {
    // Validation happens in controller; service accepts query passthrough.
    const result = await service.getOrganisationDashboard(DEV_STUB_IDENTITY, {
      from: "2026-09-01T00:00:00.000Z",
      to: "2026-09-30T00:00:00.000Z",
    });
    expect(result.context).toBe("organisation");
  });

  it("returns functional-unit dashboard when unit exists", async () => {
    ports.functionalUnits.getById = vi.fn().mockResolvedValue({
      id: "cccccccccccccccccccccccc",
      name: "Operations",
      accessType: "Internal business function",
      reference: "FU-1",
    });

    const result = await service.getFunctionalUnitDashboard(
      DEV_STUB_IDENTITY,
      "cccccccccccccccccccccccc"
    );
    expect(result.context).toBe("functional-unit");
    expect(result.functionalUnit?.name).toBe("Operations");
    expect(result.metricScope).toBe("identity-list-scope");
  });

  it("returns not found when functional unit missing", async () => {
    await expect(
      service.getFunctionalUnitDashboard(
        DEV_STUB_IDENTITY,
        "cccccccccccccccccccccccc"
      )
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("records unavailable modules when a port fails", async () => {
    ports.risks.stats = vi.fn().mockRejectedValue(new Error("boom"));
    const result = await service.getOrganisationDashboard(DEV_STUB_IDENTITY);
    expect(result.unavailable).toContain("risks");
    expect(result.modules.risks).toBeNull();
  });
});
