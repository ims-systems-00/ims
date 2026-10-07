import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@/shared/theme";
import { RisksListPage } from "@/modules/risks";
import * as risksApi from "@/modules/risks/api/risks";
import * as usersApi from "@/modules/users/api/users";
import * as fuApi from "@/modules/functional-units/api/functional-units";
import * as assetsApi from "@/modules/assets/api/assets";
import * as complianceApi from "@/modules/compliance/api/compliance";
import * as tasksApi from "@/modules/tasks/api/tasks";
import type { Risk } from "@/modules/risks/types";
import { ApiClientError } from "@/shared/lib/http/errors";
import {
  breadcrumbsForPath,
  navigationSections,
} from "@/shared/navigation";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function makeRisk(overrides: Partial<Risk> = {}): Risk {
  const now = new Date().toISOString();
  return {
    id: "aaaaaaaaaaaaaaaaaaaaaaaa",
    organizationId: "000000000000000000000001",
    reference: "RK-TEST-001",
    title: "Unpatched server",
    description: "Critical server missing patches",
    type: "Hardware",
    ownerId: "bbbbbbbbbbbbbbbbbbbbbbbb",
    initialScore: { likelihood: 3, consequence: 4, total: 12 },
    currentScore: { likelihood: 3, consequence: 4, total: 12 },
    mitigated: { status: false, by: null, on: null },
    accepted: { status: false, by: null, on: null },
    escalated: { status: false, by: null, on: null },
    attachments: [],
    complianceLinks: [],
    activity: [],
    raisedBy: "dev-stub-user",
    raisedOn: now,
    updatedBy: null,
    updatedOn: null,
    nextNudgeAt: null,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
    displayStatus: "Open",
    scoreBand: "medium",
    ...overrides,
  };
}

function renderRisksPage(initial = "/risks") {
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
            <Route path="/risks" element={<RisksListPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

function stubLookups() {
  vi.spyOn(usersApi, "listUsers").mockResolvedValue({
    items: [
      {
        user: {
          id: "bbbbbbbbbbbbbbbbbbbbbbbb",
          reference: "USR-1",
          name: "Ada Lovelace",
          email: "ada@example.com",
          systemAccess: { status: "Active" },
          loggedIn: { status: null, on: null },
        },
        membership: null,
      },
    ],
    page: 1,
    pageSize: 100,
    total: 1,
    totalPages: 1,
  });
  vi.spyOn(usersApi, "getUser").mockResolvedValue({
    user: {
      id: "bbbbbbbbbbbbbbbbbbbbbbbb",
      reference: "USR-1",
      type: "Internal",
      firstName: "Ada",
      lastName: "Lovelace",
      name: "Ada Lovelace",
      email: "ada@example.com",
      emailVerified: { status: "verified", on: null },
      phone: "",
      phoneVerified: { status: "pending", on: null },
      systemPasswordStatus: "ok",
      systemAccess: {
        status: "Active",
        period: "Full time",
        expires: null,
        updatedOn: null,
      },
      accessPolicies: [],
      profileImage: { url: "" },
      signatureInfo: {},
      preferences: { darkMode: false, activeTheme: "default" },
      country: { name: "", code: "" },
      locations: [],
      loggedIn: { status: null, on: null },
      createdBy: null,
      createdOn: null,
      deletedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    membership: null,
  });
  vi.spyOn(fuApi, "listFunctionalUnits").mockResolvedValue({
    items: [],
    page: 1,
    pageSize: 100,
    total: 0,
    totalPages: 1,
  });
  vi.spyOn(assetsApi, "listAssets").mockResolvedValue({
    items: [],
    page: 1,
    pageSize: 100,
    total: 0,
    totalPages: 1,
  });
}

describe("RisksListPage", () => {
  it("shows loading then empty state", async () => {
    stubLookups();
    vi.spyOn(risksApi, "listRisks").mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 1,
    });
    vi.spyOn(risksApi, "getRiskStats").mockResolvedValue({
      total: 0,
      open: 0,
      escalated: 0,
      mitigated: 0,
      accepted: 0,
      byScoreBand: { low: 0, medium: 0, high: 0 },
    });

    renderRisksPage();

    expect(screen.getByText(/loading risks/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.getByText(/no risks in the register yet/i)
      ).toBeInTheDocument();
    });
  });

  it("renders risk rows with score and status", async () => {
    stubLookups();
    vi.spyOn(risksApi, "listRisks").mockResolvedValue({
      items: [makeRisk()],
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    });
    vi.spyOn(risksApi, "getRiskStats").mockResolvedValue({
      total: 1,
      open: 1,
      escalated: 0,
      mitigated: 0,
      accepted: 0,
      byScoreBand: { low: 0, medium: 1, high: 0 },
    });
    vi.spyOn(risksApi, "getRisk").mockResolvedValue(makeRisk());

    renderRisksPage();

    await waitFor(() => {
      expect(screen.getByText("Unpatched server")).toBeInTheDocument();
    });
    expect(screen.getAllByText("RK-TEST-001").length).toBeGreaterThan(0);
    expect(screen.getByText(/Medium/)).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /risk summary/i })).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
  });

  it("opens create sheet from Raise risk", async () => {
    const user = userEvent.setup();
    stubLookups();
    vi.spyOn(risksApi, "listRisks").mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 1,
    });
    vi.spyOn(risksApi, "getRiskStats").mockResolvedValue({
      total: 0,
      open: 0,
      escalated: 0,
      mitigated: 0,
      accepted: 0,
      byScoreBand: { low: 0, medium: 0, high: 0 },
    });

    renderRisksPage();

    await waitFor(() => {
      expect(
        screen.getByText(/no risks in the register yet/i)
      ).toBeInTheDocument();
    });

    const raiseButtons = screen.getAllByRole("button", { name: /raise risk/i });
    await user.click(raiseButtons[0]!);
    expect(
      await screen.findByRole("heading", { name: /^raise risk$/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/^title$/i)).toBeInTheDocument();
  }, 15_000);

  it("opens details from row actions", async () => {
    const user = userEvent.setup();
    stubLookups();
    const risk = makeRisk();
    vi.spyOn(risksApi, "listRisks").mockResolvedValue({
      items: [risk],
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    });
    vi.spyOn(risksApi, "getRiskStats").mockResolvedValue({
      total: 1,
      open: 1,
      escalated: 0,
      mitigated: 0,
      accepted: 0,
      byScoreBand: { low: 0, medium: 1, high: 0 },
    });
    vi.spyOn(risksApi, "getRisk").mockResolvedValue(risk);

    renderRisksPage();

    await waitFor(() => {
      expect(screen.getByText("Unpatched server")).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole("button", { name: /actions for unpatched server/i })
    );
    await user.click(await screen.findByRole("menuitem", { name: /details/i }));

    expect(
      await screen.findByRole("button", { name: /^edit$/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^escalate$/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^nudge$/i })).toBeInTheDocument();
    expect(screen.getAllByText("RK-TEST-001").length).toBeGreaterThan(0);
    expect(screen.getByRole("tab", { name: /^details$/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /^activity$/i })).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /^life cycle$/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /^tasks$/i })).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /^linked controls$/i })
    ).toBeInTheDocument();
  }, 15_000);

  it("shows lifecycle timeline and linked controls panels", async () => {
    const user = userEvent.setup();
    stubLookups();
    const risk = makeRisk({
      escalated: {
        status: true,
        by: "bbbbbbbbbbbbbbbbbbbbbbbb",
        on: new Date().toISOString(),
      },
      displayStatus: "Escalated",
      complianceLinks: [{ toolkitId: "ISO 9001", clauseIds: ["4.1"] }],
    });
    vi.spyOn(risksApi, "listRisks").mockResolvedValue({
      items: [risk],
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    });
    vi.spyOn(risksApi, "getRiskStats").mockResolvedValue({
      total: 1,
      open: 0,
      escalated: 1,
      mitigated: 0,
      accepted: 0,
      byScoreBand: { low: 0, medium: 1, high: 0 },
    });
    vi.spyOn(risksApi, "getRisk").mockResolvedValue(risk);
    vi.spyOn(complianceApi, "listCatalogueControls").mockResolvedValue({
      items: [
        {
          id: "cccccccccccccccccccccccc",
          name: "ISO 9001",
          clause: "4.1",
          title: "Understanding the organization",
          isLocked: false,
          parentClause: "4",
        },
      ],
      page: 1,
      pageSize: 100,
      total: 1,
      totalPages: 1,
    });
    vi.spyOn(tasksApi, "listTasks").mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 1,
    });

    renderRisksPage();

    await waitFor(() => {
      expect(screen.getByText("Unpatched server")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Unpatched server"));
    await user.click(await screen.findByRole("tab", { name: /^life cycle$/i }));
    expect(await screen.findByText("Current status")).toBeInTheDocument();
    expect(screen.getAllByText("Escalated").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Raised").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Not yet").length).toBeGreaterThan(0);

    await user.click(
      screen.getByRole("tab", { name: /^linked controls$/i })
    );
    expect(
      (await screen.findAllByText("ISO 9001")).length
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("4.1").length).toBeGreaterThan(0);
    expect(
      screen.getByText(/understanding the organization/i)
    ).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /^tasks$/i }));
    expect(
      await screen.findByText(/no tasks linked to this risk/i)
    ).toBeInTheDocument();
  }, 15_000);

  it("shows forbidden state", async () => {
    stubLookups();
    vi.spyOn(risksApi, "listRisks").mockRejectedValue(
      new ApiClientError({
        message: "Forbidden",
        status: 403,
        code: "FORBIDDEN",
      })
    );
    vi.spyOn(risksApi, "getRiskStats").mockResolvedValue({
      total: 0,
      open: 0,
      escalated: 0,
      mitigated: 0,
      accepted: 0,
      byScoreBand: { low: 0, medium: 0, high: 0 },
    });

    renderRisksPage();

    await waitFor(() => {
      expect(
        screen.getByText(/you do not have permission to view risks/i)
      ).toBeInTheDocument();
    });
  });

  it("filters by status", async () => {
    const user = userEvent.setup();
    stubLookups();
    const listSpy = vi.spyOn(risksApi, "listRisks").mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 1,
    });
    vi.spyOn(risksApi, "getRiskStats").mockResolvedValue({
      total: 0,
      open: 0,
      escalated: 0,
      mitigated: 0,
      accepted: 0,
      byScoreBand: { low: 0, medium: 0, high: 0 },
    });

    renderRisksPage();

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalled();
    });

    await user.selectOptions(
      screen.getByRole("combobox", { name: /filter by status/i }),
      "Mitigated"
    );

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledWith(
        expect.objectContaining({ status: "Mitigated" })
      );
    });
  });
});

describe("Risks navigation", () => {
  it("is listed as a top-level workspace item", () => {
    const risks = navigationSections[0]!.items.find(
      (item) => item.id === "risks"
    );
    expect(risks?.href).toBe("/risks");
    expect(breadcrumbsForPath("/risks", navigationSections)).toEqual([
      { label: "Dashboard", href: "/" },
      { label: "Risks", href: "/risks" },
    ]);
  });
});
