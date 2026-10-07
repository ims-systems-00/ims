import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@/shared/theme";
import { OrganisationDashboardPage } from "@/modules/dashboard";
import * as dashboardApi from "@/modules/dashboard/api/dashboard";
import * as statsApi from "@/modules/dashboard/api/stats";
import type {
  AuditStatsResult,
  CipStatsResult,
  ComplianceStats,
  CrmStatsResult,
  DigitalMaturityStats,
  GlobalStats,
  IncidentStatsResult,
  InventoryStatsResult,
  LiveDashboard,
  RiskStatsResult,
  SupplierStatsResult,
} from "@/modules/dashboard/types";
import { ApiClientError } from "@/shared/lib/http/errors";
import { navigationSections } from "@/shared/navigation";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function makeDashboard(
  overrides: Partial<LiveDashboard> = {}
): LiveDashboard {
  return {
    context: "organisation",
    accurateAs: "2026-09-28T12:00:00.000Z",
    organizationId: "000000000000000000000001",
    headline: {
      organisationalConfidence: 40,
      organisationalState: "Safe",
      criticalArea: null,
    },
    counts: {
      businessUnits: 2,
      complianceBodies: 1,
      staff: 5,
      remoteStaff: 1,
      premises: 3,
      openTasks: 4,
    },
    modules: {
      risks: {
        total: 2,
        open: 1,
        escalated: 0,
        mitigated: 1,
        accepted: 0,
        byScoreBand: { low: 1, medium: 1, high: 0 },
      },
      incidents: {
        total: 0,
        open: 0,
        escalated: 0,
        resolved: 0,
        byPriority: { P1: 0, P2: 0, P3: 0, P4: 0 },
      },
      audits: {
        total: 1,
        scheduled: 1,
        completed: 0,
        upcoming: 0,
        byType: { Internal: 1, External: 0 },
      },
      ofi: { total: 0, pending: 0, inProgress: 0, implemented: 0 },
      suppliers: null,
      inventory: { categories: [], totalCount: 0, totalCost: 0 },
      managementReviews: {
        total: 0,
        scheduled: 0,
        completed: 0,
        upcoming: 0,
      },
    },
    unavailable: [],
    metricScope: "identity-list-scope",
    ...overrides,
  };
}

function makeGlobalStats(overrides: Partial<GlobalStats> = {}): GlobalStats {
  return {
    accurateAs: "2026-09-28T12:00:00.000Z",
    organizationalConfidence: 40,
    organizationalState: "Safe",
    criticalArea: "Hardware",
    businessUnit: 2,
    numberOfStaffs: 5,
    numberOfStaffsRemote: 1,
    complianceBodies: 1,
    incidentResolutionTimes: [
      {
        priority: "P1",
        averageHours: null,
        count: 0,
        alert: false,
        targetHours: null,
      },
      {
        priority: "P2",
        averageHours: null,
        count: 0,
        alert: false,
        targetHours: null,
      },
      {
        priority: "P3",
        averageHours: null,
        count: 0,
        alert: false,
        targetHours: null,
      },
      {
        priority: "P4",
        averageHours: null,
        count: 0,
        alert: false,
        targetHours: null,
      },
    ],
    ...overrides,
  };
}

const emptyRisk: RiskStatsResult = {
  months: 12,
  byType: { months: ["JAN"], series: { Hardware: [0] } },
  byStatus: { months: ["JAN"], series: { Open: [0] } },
  topBusinessFunctions: [],
};

const emptyIncident: IncidentStatsResult = { byBusinessFunction: [] };
const emptyAudit: AuditStatsResult = {
  total: 0,
  scheduled: 0,
  completed: 0,
  nonConformitiesByBusinessUnit: [],
};
const emptyInventory: InventoryStatsResult = {
  amounts: [0, 0, 0, 0, 0],
  areas: ["Hardware", "Software", "People", "Premises", "Information"],
  costs: [0, 0, 0, 0, 0],
};
const emptySupplier: SupplierStatsResult = {
  procurementValue: 0,
  supplierIncidents: {
    totalIncidents: 0,
    openIncidents: 0,
    resolvedIncidents: 0,
  },
  supplierCompliance: {
    compliant: 0,
    inCompliant: 0,
    percentage: 0,
    riskLevel: "Hazardous",
  },
};
const emptyCip: CipStatsResult = { byBusinessUnit: [] };
const emptyMaturity: DigitalMaturityStats = {
  businessUnitMaturity: [],
  organisationalMaturity: [],
};
const unavailableCompliance: ComplianceStats = {
  frameworks: [],
  unavailable: true,
};
const crmWithUnavailableInvoices: CrmStatsResult = {
  totalContractValue: 1000,
  averageContractValue: 500,
  highest: { name: "Acme", value: 800, stage: "Live" },
  lowest: { name: "Beta", value: 200, stage: "Prospect" },
  byStage: [{ stage: "Live", count: 1, contractValue: 800 }],
  invoicesByMonth: [],
  invoicesUnavailable: true,
};

function stubAllStatsSuccess() {
  vi.spyOn(statsApi, "getGlobalStats").mockResolvedValue(makeGlobalStats());
  vi.spyOn(statsApi, "getDigitalMaturityStats").mockResolvedValue(
    emptyMaturity
  );
  vi.spyOn(statsApi, "getComplianceStats").mockResolvedValue(
    unavailableCompliance
  );
  vi.spyOn(statsApi, "getAuditStats").mockResolvedValue(emptyAudit);
  vi.spyOn(statsApi, "getRiskStats").mockResolvedValue(emptyRisk);
  vi.spyOn(statsApi, "getIncidentStats").mockResolvedValue(emptyIncident);
  vi.spyOn(statsApi, "getInventoryStats").mockResolvedValue(emptyInventory);
  vi.spyOn(statsApi, "getSupplierStats").mockResolvedValue(emptySupplier);
  vi.spyOn(statsApi, "getCipStats").mockResolvedValue(emptyCip);
  vi.spyOn(statsApi, "getCrmStats").mockResolvedValue(
    crmWithUnavailableInvoices
  );
}

function renderDashboard(initial = "/") {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return render(
    <ThemeProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[initial]}>
          <Routes>
            <Route path="/" element={<OrganisationDashboardPage />} />
            <Route path="/risks" element={<div>Risks page</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

describe("Organisation Live Dashboard", () => {
  it("is mounted at the workspace index route in navigation", () => {
    const dashboard = navigationSections[0]!.items.find(
      (item) => item.id === "dashboard"
    )!;
    expect(dashboard.href).toBe("/");
    expect(dashboard.label).toBe("Live Dashboard");
  });

  it("renders KPI summary from the Dashboard API", async () => {
    vi.spyOn(dashboardApi, "getOrganisationDashboard").mockResolvedValue(
      makeDashboard()
    );
    stubAllStatsSuccess();

    renderDashboard();

    expect(
      await screen.findByRole("heading", {
        name: /organisation live dashboard/i,
      })
    ).toBeInTheDocument();

    const summary = await screen.findByLabelText(/organisation summary/i);
    expect(within(summary).getByText("Staff")).toBeInTheDocument();
    expect(within(summary).getByText("5")).toBeInTheDocument();
    expect(within(summary).getByText("Business units")).toBeInTheDocument();
    expect(within(summary).getByText("Open tasks")).toBeInTheDocument();
    expect(within(summary).getByText("4")).toBeInTheDocument();
    expect(screen.getByText(/critical area: hardware/i)).toBeInTheDocument();
  });

  it("shows a full-page alert when the primary Dashboard API fails", async () => {
    vi.spyOn(dashboardApi, "getOrganisationDashboard").mockRejectedValue(
      new ApiClientError({
        message: "Dashboard forbidden",
        status: 403,
        code: "FORBIDDEN",
      })
    );
    stubAllStatsSuccess();

    renderDashboard();

    const alerts = await screen.findAllByRole("alert");
    expect(
      alerts.some((node) => /dashboard forbidden/i.test(node.textContent ?? ""))
    ).toBe(true);
  });

  it("keeps other panels when one Stats query fails", async () => {
    vi.spyOn(dashboardApi, "getOrganisationDashboard").mockResolvedValue(
      makeDashboard()
    );
    stubAllStatsSuccess();
    vi.spyOn(statsApi, "getRiskStats").mockRejectedValue(
      new ApiClientError({
        message: "Risk stats failed",
        status: 500,
        code: "INTERNAL_ERROR",
      })
    );

    renderDashboard();

    expect(
      await screen.findByText(/critical area: hardware/i)
    ).toBeInTheDocument();
    expect(
      (await screen.findAllByText(/risk stats failed/i)).length
    ).toBeGreaterThan(0);
    expect(
      screen.getByText(/compliance statistics unavailable/i)
    ).toBeInTheDocument();
  });

  it("renders compliance unavailable distinctly from zero", async () => {
    vi.spyOn(dashboardApi, "getOrganisationDashboard").mockResolvedValue(
      makeDashboard()
    );
    stubAllStatsSuccess();

    renderDashboard();

    expect(
      await screen.findByText(/compliance statistics unavailable/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/compliance overview could not be loaded/i)
    ).toBeInTheDocument();
  });

  it("renders CRM invoice unavailable without implying zero invoices", async () => {
    vi.spyOn(dashboardApi, "getOrganisationDashboard").mockResolvedValue(
      makeDashboard()
    );
    stubAllStatsSuccess();

    renderDashboard();

    expect(
      await screen.findByText(/invoice statistics unavailable/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/total contract value/i)).toBeInTheDocument();
  });

  it("shows zero inventory amounts as zero, not unavailable", async () => {
    vi.spyOn(dashboardApi, "getOrganisationDashboard").mockResolvedValue(
      makeDashboard()
    );
    stubAllStatsSuccess();

    renderDashboard();

    const inventory = await screen.findByLabelText(/asset counts by area/i);
    expect(within(inventory).getByText("Hardware")).toBeInTheDocument();
    expect(
      within(inventory).getAllByText(/0 ·/).length
    ).toBeGreaterThan(0);
    expect(
      within(inventory).queryByText(/unavailable/i)
    ).not.toBeInTheDocument();
  });

  it("refreshes dashboard and stats on Refresh", async () => {
    const dashboardSpy = vi
      .spyOn(dashboardApi, "getOrganisationDashboard")
      .mockResolvedValue(makeDashboard());
    stubAllStatsSuccess();
    const globalSpy = vi.spyOn(statsApi, "getGlobalStats");

    const user = userEvent.setup();
    renderDashboard();

    await screen.findByRole("heading", {
      name: /organisation live dashboard/i,
    });

    const initialDashboardCalls = dashboardSpy.mock.calls.length;
    const initialGlobalCalls = globalSpy.mock.calls.length;

    await user.click(screen.getByRole("button", { name: /refresh/i }));

    await waitFor(() => {
      expect(dashboardSpy.mock.calls.length).toBeGreaterThan(
        initialDashboardCalls
      );
      expect(globalSpy.mock.calls.length).toBeGreaterThan(initialGlobalCalls);
    });
  });

  it("links KPI cards to existing module routes", async () => {
    vi.spyOn(dashboardApi, "getOrganisationDashboard").mockResolvedValue(
      makeDashboard()
    );
    stubAllStatsSuccess();

    renderDashboard();

    const summary = await screen.findByLabelText(/organisation summary/i);
    expect(
      within(summary).getByRole("link", { name: /staff/i })
    ).toHaveAttribute("href", "/users");
    expect(
      within(summary).getByRole("link", { name: /risks/i })
    ).toHaveAttribute("href", "/risks");
    expect(
      within(summary).getByRole("link", { name: /open tasks/i })
    ).toHaveAttribute("href", "/tasks");
  });
});
