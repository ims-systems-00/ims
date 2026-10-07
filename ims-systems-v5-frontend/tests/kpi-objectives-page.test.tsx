import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@/shared/theme";
import { KpiObjectivesPage } from "@/modules/kpi-objectives";
import * as kpiApi from "@/modules/kpi-objectives/api/kpi-objectives";
import * as fuApi from "@/modules/functional-units/api/functional-units";
import type { KpiObjective } from "@/modules/kpi-objectives/types";
import { DEV_STUB_IDENTITY } from "@/security";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function makeKpi(overrides: Partial<KpiObjective> = {}): KpiObjective {
  const now = new Date().toISOString();
  return {
    id: "aaaaaaaaaaaaaaaaaaaaaaaa",
    organizationId: "000000000000000000000001",
    reference: "KPI-TEST-1",
    value: "Reduce P1 incidents",
    privacy: "Organisational",
    targetValue: 0,
    currentValue: 0,
    progressPercentage: 0,
    unit: "",
    createdBy: DEV_STUB_IDENTITY.subjectId,
    createdOn: now,
    updatedBy: null,
    updatedOn: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <ThemeProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/kpi-objectives"]}>
          <Routes>
            <Route path="/kpi-objectives" element={<KpiObjectivesPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

describe("KpiObjectivesPage", () => {
  it("renders organisational KPIs and creator actions", async () => {
    vi.spyOn(kpiApi, "listKpiObjectives").mockResolvedValue({
      items: [makeKpi()],
      page: 1,
      pageSize: 200,
      total: 1,
      totalPages: 1,
    });
    vi.spyOn(fuApi, "listFunctionalUnits").mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 100,
      total: 0,
      totalPages: 1,
    });

    renderPage();

    expect(
      await screen.findByRole("heading", { name: /kpi\/objectives/i })
    ).toBeInTheDocument();
    expect(await screen.findByText("Reduce P1 incidents")).toBeInTheDocument();
    expect(screen.getByText("KPI-TEST-1")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /edit kpi-test-1/i })
    ).toBeInTheDocument();
  });

  it("shows organisation empty state", async () => {
    vi.spyOn(kpiApi, "listKpiObjectives").mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 200,
      total: 0,
      totalPages: 1,
    });
    vi.spyOn(fuApi, "listFunctionalUnits").mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 100,
      total: 0,
      totalPages: 1,
    });

    renderPage();

    expect(
      await screen.findByText(
        /your organisation has no kpi\/objective\(s\) set up/i
      )
    ).toBeInTheDocument();
  });

  it("creates a KPI from the Add KPI tab", async () => {
    vi.spyOn(kpiApi, "listKpiObjectives").mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 200,
      total: 0,
      totalPages: 1,
    });
    vi.spyOn(fuApi, "listFunctionalUnits").mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 100,
      total: 0,
      totalPages: 1,
    });
    const createSpy = vi
      .spyOn(kpiApi, "createKpiObjective")
      .mockResolvedValue(makeKpi({ value: "New objective" }));

    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("tab", { name: /add kpi/i }));
    const form = await screen.findByLabelText(/add kpi/i);
    await user.selectOptions(
      within(form).getByLabelText(/^privacy/i),
      "Organisational"
    );
    await user.type(
      within(form).getByLabelText(/kpi\/objective/i),
      "New objective"
    );
    await user.click(within(form).getByRole("button", { name: /^add kpi$/i }));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith({
        value: "New objective",
        privacy: "Organisational",
        businessUnitId: null,
      });
    });
  });
});
