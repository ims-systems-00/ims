import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@/shared/theme";
import { IncidentsListPage } from "@/modules/incidents";
import * as incidentsApi from "@/modules/incidents/api/incidents";
import * as complianceApi from "@/modules/compliance/api/compliance";
import * as tasksApi from "@/modules/tasks/api/tasks";
import * as usersApi from "@/modules/users/api/users";
import * as fuApi from "@/modules/functional-units/api/functional-units";
import type { Incident } from "@/modules/incidents/types";
import { ApiClientError } from "@/shared/lib/http/errors";
import {
  breadcrumbsForPath,
  navigationSections,
} from "@/shared/navigation";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function makeIncident(overrides: Partial<Incident> = {}): Incident {
  const now = new Date().toISOString();
  return {
    id: "aaaaaaaaaaaaaaaaaaaaaaaa",
    organizationId: "000000000000000000000001",
    reference: "INC-TEST-001",
    title: "Server room water leak",
    description: "Water detected under cooling unit",
    businessUnitId: "cccccccccccccccccccccccc",
    priority: "P2",
    ownerId: "bbbbbbbbbbbbbbbbbbbbbbbb",
    privacy: "Business unit",
    resolved: { status: false, by: null, on: null },
    resolutionTimeMs: null,
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
    ...overrides,
  };
}

function renderIncidentsPage(initial = "/incidents") {
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
            <Route path="/incidents" element={<IncidentsListPage />} />
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
  const now = new Date().toISOString();
  const unit = {
    id: "cccccccccccccccccccccccc",
    organizationId: "000000000000000000000001",
    reference: "FU-1",
    name: "Operations",
    accessType: "Internal business function" as const,
    responsibility: "Ops",
    totalMembers: 0,
    complianceToolkits: [],
    userLicences: {
      superUser: { allocated: 0, used: 0 },
      hosUser: { allocated: 0, used: 0 },
      basicUser: { allocated: 0, used: 0 },
      auditorUser: { allocated: 0, used: 0 },
    },
    isSystemDefault: false,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  vi.spyOn(fuApi, "listFunctionalUnits").mockResolvedValue({
    items: [unit],
    page: 1,
    pageSize: 100,
    total: 1,
    totalPages: 1,
  });
  vi.spyOn(fuApi, "getFunctionalUnit").mockResolvedValue(unit);
}

describe("IncidentsListPage", () => {
  it("shows loading then empty state", async () => {
    stubLookups();
    vi.spyOn(incidentsApi, "listIncidents").mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 1,
    });
    vi.spyOn(incidentsApi, "getIncidentStats").mockResolvedValue({
      total: 0,
      open: 0,
      escalated: 0,
      resolved: 0,
      byPriority: { P1: 0, P2: 0, P3: 0, P4: 0 },
    });

    renderIncidentsPage();

    expect(screen.getByText(/loading incidents/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.getByText(/no incidents in the register yet/i)
      ).toBeInTheDocument();
    });
  });

  it("renders incident rows with priority and status", async () => {
    stubLookups();
    vi.spyOn(incidentsApi, "listIncidents").mockResolvedValue({
      items: [makeIncident()],
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    });
    vi.spyOn(incidentsApi, "getIncidentStats").mockResolvedValue({
      total: 1,
      open: 1,
      escalated: 0,
      resolved: 0,
      byPriority: { P1: 0, P2: 1, P3: 0, P4: 0 },
    });
    vi.spyOn(incidentsApi, "getIncident").mockResolvedValue(makeIncident());

    renderIncidentsPage();

    await waitFor(() => {
      expect(screen.getByText("Server room water leak")).toBeInTheDocument();
    });
    expect(screen.getAllByText("INC-TEST-001").length).toBeGreaterThan(0);
    expect(screen.getAllByText("P2").length).toBeGreaterThan(0);
    expect(screen.getByRole("group", { name: /incident summary/i })).toBeInTheDocument();
  });

  it("opens create sheet from Raise incident", async () => {
    const user = userEvent.setup();
    stubLookups();
    vi.spyOn(incidentsApi, "listIncidents").mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 1,
    });
    vi.spyOn(incidentsApi, "getIncidentStats").mockResolvedValue({
      total: 0,
      open: 0,
      escalated: 0,
      resolved: 0,
      byPriority: { P1: 0, P2: 0, P3: 0, P4: 0 },
    });

    renderIncidentsPage();

    await waitFor(() => {
      expect(
        screen.getByText(/no incidents in the register yet/i)
      ).toBeInTheDocument();
    });

    await user.click(
      screen.getAllByRole("button", { name: /raise incident/i })[0]!
    );
    expect(
      await screen.findByRole("heading", { name: /^raise incident$/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/^title$/i)).toBeInTheDocument();
  }, 15_000);

  it("opens details from row actions with lifecycle controls", async () => {
    const user = userEvent.setup();
    stubLookups();
    const incident = makeIncident();
    vi.spyOn(incidentsApi, "listIncidents").mockResolvedValue({
      items: [incident],
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    });
    vi.spyOn(incidentsApi, "getIncidentStats").mockResolvedValue({
      total: 1,
      open: 1,
      escalated: 0,
      resolved: 0,
      byPriority: { P1: 0, P2: 1, P3: 0, P4: 0 },
    });
    vi.spyOn(incidentsApi, "getIncident").mockResolvedValue(incident);

    renderIncidentsPage();

    await waitFor(() => {
      expect(screen.getByText("Server room water leak")).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole("button", {
        name: /actions for server room water leak/i,
      })
    );
    await user.click(await screen.findByRole("menuitem", { name: /details/i }));

    expect(
      await screen.findByRole("button", { name: /^edit$/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^escalate$/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^nudge$/i })).toBeInTheDocument();
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
    const incident = makeIncident({
      escalated: {
        status: true,
        by: "bbbbbbbbbbbbbbbbbbbbbbbb",
        on: new Date().toISOString(),
      },
      displayStatus: "Escalated",
      complianceLinks: [{ toolkitId: "ISO 9001", clauseIds: ["4.1"] }],
    });
    vi.spyOn(incidentsApi, "listIncidents").mockResolvedValue({
      items: [incident],
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    });
    vi.spyOn(incidentsApi, "getIncidentStats").mockResolvedValue({
      total: 1,
      open: 0,
      escalated: 1,
      resolved: 0,
      byPriority: { P1: 0, P2: 1, P3: 0, P4: 0 },
    });
    vi.spyOn(incidentsApi, "getIncident").mockResolvedValue(incident);
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

    renderIncidentsPage();

    await waitFor(() => {
      expect(screen.getByText("Server room water leak")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Server room water leak"));
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
      await screen.findByText(/no tasks linked to this incident/i)
    ).toBeInTheDocument();
  }, 15_000);

  it("shows forbidden state", async () => {
    stubLookups();
    vi.spyOn(incidentsApi, "listIncidents").mockRejectedValue(
      new ApiClientError({
        message: "Forbidden",
        status: 403,
        code: "FORBIDDEN",
      })
    );
    vi.spyOn(incidentsApi, "getIncidentStats").mockResolvedValue({
      total: 0,
      open: 0,
      escalated: 0,
      resolved: 0,
      byPriority: { P1: 0, P2: 0, P3: 0, P4: 0 },
    });

    renderIncidentsPage();

    await waitFor(() => {
      expect(
        screen.getByText(/you do not have permission to view incidents/i)
      ).toBeInTheDocument();
    });
  });

  it("filters by status", async () => {
    const user = userEvent.setup();
    stubLookups();
    const listSpy = vi.spyOn(incidentsApi, "listIncidents").mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 1,
    });
    vi.spyOn(incidentsApi, "getIncidentStats").mockResolvedValue({
      total: 0,
      open: 0,
      escalated: 0,
      resolved: 0,
      byPriority: { P1: 0, P2: 0, P3: 0, P4: 0 },
    });

    renderIncidentsPage();

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalled();
    });

    await user.selectOptions(
      screen.getByRole("combobox", { name: /filter by status/i }),
      "Escalated"
    );

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledWith(
        expect.objectContaining({ status: "Escalated" })
      );
    });
  });
});

describe("Incidents navigation", () => {
  it("is listed as a top-level workspace item", () => {
    const incidents = navigationSections[0]!.items.find(
      (item) => item.id === "incidents"
    );
    expect(incidents?.href).toBe("/incidents");
    expect(breadcrumbsForPath("/incidents", navigationSections)).toEqual([
      { label: "Dashboard", href: "/" },
      { label: "Incidents", href: "/incidents" },
    ]);
  });
});
