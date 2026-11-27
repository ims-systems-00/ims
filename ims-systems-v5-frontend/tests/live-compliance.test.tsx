import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@/shared/theme";
import {
  LiveComplianceOverviewPage,
  ModuleComplianceStrip,
} from "@/modules/live-compliance";
import * as liveApi from "@/modules/live-compliance/api/live-compliance";
import type {
  AdviceItem,
  LiveClause,
  LiveHealthResponse,
} from "@/modules/live-compliance/types";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function clause(overrides: Partial<LiveClause>): LiveClause {
  return {
    id: `id-${overrides.clause}-${overrides.standard ?? "ISO 9001"}`,
    standard: "ISO 9001",
    clause: "7.2",
    title: "Competence",
    module: "training",
    live: true,
    status: "risk",
    detail: "1 competency expire within 30 days",
    due: "2026-11-29",
    evaluatedAt: "2026-11-25T10:00:00.000Z",
    ...overrides,
  };
}

const refresher: AdviceItem = {
  id: "tr-p1-cscs",
  module: "training",
  clause: "7.2",
  standards: ["ISO 9001"],
  severity: "med",
  due: "2026-11-29",
  title: "Sam Patel: CSCS expires 29 Nov 2026",
  why: "ISO 7.2 needs everyone competent for their role.",
  action: {
    type: "navigate",
    label: "Book refresher",
    href: "/training?createSession=1&cid=cscs&attendees=p1",
  },
};

const investigate: AdviceItem = {
  id: "inv-i221",
  module: "incidents",
  clause: "10.2",
  standards: ["ISO 9001"],
  severity: "med",
  due: null,
  title: "INC-221 Near miss at Press Line 2: not investigated",
  why: 'Logged 20 Nov 2026. "Reached past light curtain".',
  action: { type: "execute", label: "Start investigation", command: "incident.investigate", ref: "i221" },
};

function renderAt(path: string, element: React.ReactNode, extraRoutes: React.ReactNode = null) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <ThemeProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path={path.split("?")[0]} element={element} />
            {extraRoutes}
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

describe("LiveComplianceOverviewPage", () => {
  it("shows health per standard, advice, activity and the clause table", async () => {
    const health: LiveHealthResponse = {
      evaluatedAt: "2026-11-25T10:00:00.000Z",
      standards: [
        { standard: "ISO 9001", total: 3, sustained: 1, implemented: 0, atRisk: 1, lapsed: 1, inProgress: 0, notStarted: 0, percentage: 67, worst: "lapsed" },
      ],
      clauses: [
        clause({ clause: "7.2" }),
        clause({ clause: "7.1.5", title: "Monitoring and measuring resources", module: "inventory", status: "lapsed", detail: "Torque wrench TW-02: calibration overdue" }),
        clause({ clause: "4.3", title: "Scope", module: "compliance", live: false, status: "impl", detail: "Marked implemented in the toolkit" }),
      ],
    };
    vi.spyOn(liveApi, "getLiveHealth").mockResolvedValue(health);
    vi.spyOn(liveApi, "listAdvice").mockResolvedValue({ items: [refresher], total: 1 });
    vi.spyOn(liveApi, "listLiveActivity").mockResolvedValue([
      { id: "a1", source: "Compliance", text: "Clause 7.2 Competence is now At risk (ISO 9001).", at: "2026-11-25T10:00:00.000Z" },
    ]);

    renderAt("/compliance/live", <LiveComplianceOverviewPage />);

    expect(await screen.findByText("67% compliant today")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "67% compliant today" })).toBeInTheDocument();
    const doNext = await screen.findByRole("list", { name: "Do next" });
    expect(within(doNext).getByRole("listitem", { name: refresher.title })).toBeInTheDocument();
    // Cross-module list names the module in each row.
    expect(within(doNext).getByText("Training · ISO 7.2")).toBeInTheDocument();
    expect(within(doNext).getByText("Due 29 Nov 2026")).toBeInTheDocument();
    expect(await screen.findByText(/Clause 7.2 Competence is now At risk/)).toBeInTheDocument();

    const table = screen.getByRole("table");
    const rows = within(table).getAllByRole("row");
    // header + 3 clauses, sorted numerically (4.3, 7.1.5, 7.2)
    expect(rows.map((r) => within(r).queryAllByRole("cell")[0]?.textContent ?? "header")).toEqual([
      "header",
      "4.3",
      "7.1.5",
      "7.2",
    ]);
    expect(within(rows[1]!).getByText("(manual)")).toBeInTheDocument();
    expect(within(rows[2]!).getByText("Lapsed")).toBeInTheDocument();
    expect(within(rows[2]!).getByRole("link", { name: "Inventory" })).toHaveAttribute("href", "/inventory");
  });

  it("explains how to start when no ISO toolkit is set up", async () => {
    vi.spyOn(liveApi, "getLiveHealth").mockResolvedValue({ evaluatedAt: null, standards: [], clauses: [] });
    renderAt("/compliance/live", <LiveComplianceOverviewPage />);
    expect(await screen.findByText("No ISO standard set up yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open compliance toolkits" })).toHaveAttribute("href", "/compliance");
  });
});

describe("ModuleComplianceStrip", () => {
  it("renders nothing when the module has no monitored clauses", async () => {
    const moduleSpy = vi
      .spyOn(liveApi, "getModuleHealth")
      .mockResolvedValue({ module: "training", name: "Training", percentage: 0, worst: "not", clauses: [] });
    const adviceSpy = vi.spyOn(liveApi, "listAdvice");
    const { container } = renderAt("/training", <ModuleComplianceStrip module="training" />);
    await waitFor(() => expect(moduleSpy).toHaveBeenCalled());
    expect(container.querySelector("section")).toBeNull();
    expect(adviceSpy).not.toHaveBeenCalled();
  });

  it("shows the header, merges standards per clause, and navigates from advice", async () => {
    vi.spyOn(liveApi, "getModuleHealth").mockResolvedValue({
      module: "training",
      name: "Training",
      percentage: 50,
      worst: "risk",
      clauses: [
        clause({ clause: "7.2", standard: "ISO 9001" }),
        clause({ clause: "7.2", standard: "ISO 45001", status: "lapsed" }),
        clause({ clause: "7.3", title: "Awareness", status: "sus", detail: "Policy read by 96%" }),
      ],
    });
    vi.spyOn(liveApi, "listAdvice").mockResolvedValue({ items: [refresher], total: 1 });
    const user = userEvent.setup();

    renderAt(
      "/training",
      <ModuleComplianceStrip module="training" />,
      <Route path="/training-target" element={<p>never</p>} />
    );

    expect(await screen.findByRole("region", { name: "ISO compliance for Training" })).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText("Compliant today, something needs attention soon")).toBeInTheDocument();
    const chips = screen.getByRole("list", { name: "Clauses" });
    // One chip per clause; 7.2 shows the worst status across its standards.
    expect(within(chips).getAllByRole("listitem")).toHaveLength(2);
    // 7.2 shows its worst status (Lapsed) for screen readers; evidence in tooltip.
    const competence = within(chips).getAllByRole("listitem")[0]!;
    expect(competence).toHaveTextContent("7.2Competence: Lapsed");
    expect(competence).toHaveAttribute("title", "1 competency expire within 30 days");
    // Rows in a module strip omit the module name.
    expect(await screen.findByText("ISO 7.2")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "50% compliant today" })).toBeInTheDocument();

    await user.click(await screen.findByRole("button", { name: "Book refresher" }));
    // Navigation replaced the strip route (same path, query added) without crashing.
    expect(screen.queryByText("never")).toBeNull();
  });

  it("runs one-click actions and snoozes advice", async () => {
    vi.spyOn(liveApi, "getModuleHealth").mockResolvedValue({
      module: "incidents",
      name: "Incidents",
      percentage: 100,
      worst: "risk",
      clauses: [clause({ clause: "9.1", title: "Monitoring", module: "incidents", status: "sus" })],
    });
    vi.spyOn(liveApi, "listAdvice").mockResolvedValue({ items: [investigate], total: 1 });
    const run = vi.spyOn(liveApi, "runAdviceAction").mockResolvedValue({ message: "INC-221 investigation started" });
    const snooze = vi
      .spyOn(liveApi, "snoozeAdvice")
      .mockResolvedValue({ adviceId: investigate.id, snoozedUntil: "2026-12-02T00:00:00.000Z" });
    const user = userEvent.setup();

    renderAt("/incidents", <ModuleComplianceStrip module="incidents" />);

    await user.click(await screen.findByRole("button", { name: "Start investigation" }));
    expect(run).toHaveBeenCalledWith("inv-i221");

    await user.click(screen.getByRole("button", { name: "Snooze" }));
    expect(snooze).toHaveBeenCalledWith("inv-i221", 7);
  });
});
