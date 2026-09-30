import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@/shared/theme";
import { InternalAuditsListPage } from "@/modules/audits";
import * as auditsApi from "@/modules/audits/api/audits";
import * as usersApi from "@/modules/users/api/users";
import * as fuApi from "@/modules/functional-units/api/functional-units";
import type { Audit } from "@/modules/audits/types";
import { ApiClientError } from "@/shared/lib/http/errors";
import {
  breadcrumbsForPath,
  navigationSections,
} from "@/shared/navigation";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function makeAudit(overrides: Partial<Audit> = {}): Audit {
  const now = new Date().toISOString();
  return {
    id: "aaaaaaaaaaaaaaaaaaaaaaaa",
    organizationId: "000000000000000000000001",
    reference: "AUD-TEST-001",
    title: "ISO 27001 internal review",
    type: "Internal",
    focusArea: "Access control",
    businessUnitId: "cccccccccccccccccccccccc",
    complianceBodyId: "dddddddddddddddddddddddd",
    auditorId: "bbbbbbbbbbbbbbbbbbbbbbbb",
    startDate: new Date(Date.now() - 86_400_000).toISOString(),
    time: "09:00",
    interval: "Yearly",
    identifications: [],
    risks: [],
    ofis: [],
    attachments: [],
    complianceLinks: [],
    completed: { status: false, by: null, on: null },
    createdBy: "dev-stub-user",
    createdOn: now,
    updatedBy: null,
    updatedOn: null,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
    displayStatus: "Scheduled",
    ...overrides,
  };
}

function renderAuditsPage(initial = "/audits/internal") {
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
            <Route
              path="/audits/internal"
              element={<InternalAuditsListPage />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

function stubLookups() {
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
      createdAt: now,
      updatedAt: now,
    },
    membership: null,
  });
  vi.spyOn(fuApi, "listFunctionalUnits").mockResolvedValue({
    items: [
      unit,
      { ...unit, id: "dddddddddddddddddddddddd", name: "Compliance", reference: "FU-2" },
    ],
    page: 1,
    pageSize: 100,
    total: 2,
    totalPages: 1,
  });
  vi.spyOn(fuApi, "getFunctionalUnit").mockImplementation(async (id) => {
    if (id === "dddddddddddddddddddddddd") {
      return { ...unit, id, name: "Compliance", reference: "FU-2" };
    }
    return unit;
  });
}

describe("InternalAuditsListPage", () => {
  it("shows loading then empty state", async () => {
    stubLookups();
    vi.spyOn(auditsApi, "listAudits").mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 1,
    });
    vi.spyOn(auditsApi, "getAuditStats").mockResolvedValue({
      total: 0,
      scheduled: 0,
      completed: 0,
      upcoming: 0,
      byType: { Internal: 0, External: 0 },
    });

    renderAuditsPage();

    expect(screen.getByText(/loading audits/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.getByText(/no internal audits scheduled yet/i)
      ).toBeInTheDocument();
    });
  });

  it("renders audit rows with status and interval", async () => {
    stubLookups();
    vi.spyOn(auditsApi, "listAudits").mockResolvedValue({
      items: [makeAudit()],
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    });
    vi.spyOn(auditsApi, "getAuditStats").mockResolvedValue({
      total: 1,
      scheduled: 1,
      completed: 0,
      upcoming: 0,
      byType: { Internal: 1, External: 0 },
    });
    vi.spyOn(auditsApi, "getAudit").mockResolvedValue(makeAudit());

    renderAuditsPage();

    await waitFor(() => {
      expect(
        screen.getByText("ISO 27001 internal review")
      ).toBeInTheDocument();
    });
    expect(screen.getAllByText("AUD-TEST-001").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Scheduled").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("group", { name: /audit summary/i })
    ).toBeInTheDocument();
  });

  it("opens schedule sheet from Schedule audit", async () => {
    const user = userEvent.setup();
    stubLookups();
    vi.spyOn(auditsApi, "listAudits").mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 1,
    });
    vi.spyOn(auditsApi, "getAuditStats").mockResolvedValue({
      total: 0,
      scheduled: 0,
      completed: 0,
      upcoming: 0,
      byType: { Internal: 0, External: 0 },
    });

    renderAuditsPage();

    await waitFor(() => {
      expect(
        screen.getByText(/no internal audits scheduled yet/i)
      ).toBeInTheDocument();
    });

    await user.click(
      screen.getAllByRole("button", { name: /schedule audit/i })[0]!
    );
    expect(
      await screen.findByRole("heading", {
        name: /schedule internal audit/i,
      })
    ).toBeInTheDocument();
  }, 15_000);

  it("opens details with complete and edit actions", async () => {
    const user = userEvent.setup();
    stubLookups();
    const audit = makeAudit();
    vi.spyOn(auditsApi, "listAudits").mockResolvedValue({
      items: [audit],
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    });
    vi.spyOn(auditsApi, "getAuditStats").mockResolvedValue({
      total: 1,
      scheduled: 1,
      completed: 0,
      upcoming: 0,
      byType: { Internal: 1, External: 0 },
    });
    vi.spyOn(auditsApi, "getAudit").mockResolvedValue(audit);

    renderAuditsPage();

    await waitFor(() => {
      expect(
        screen.getByText("ISO 27001 internal review")
      ).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole("button", {
        name: /actions for iso 27001 internal review/i,
      })
    );
    await user.click(await screen.findByRole("menuitem", { name: /details/i }));

    expect(
      await screen.findByRole("button", { name: /^edit$/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^complete$/i })
    ).toBeInTheDocument();
  }, 15_000);

  it("shows forbidden state", async () => {
    stubLookups();
    vi.spyOn(auditsApi, "listAudits").mockRejectedValue(
      new ApiClientError({
        message: "Forbidden",
        status: 403,
        code: "FORBIDDEN",
      })
    );
    vi.spyOn(auditsApi, "getAuditStats").mockResolvedValue({
      total: 0,
      scheduled: 0,
      completed: 0,
      upcoming: 0,
      byType: { Internal: 0, External: 0 },
    });

    renderAuditsPage();

    await waitFor(() => {
      expect(
        screen.getByText(/you do not have permission to view audits/i)
      ).toBeInTheDocument();
    });
  });

  it("filters by status", async () => {
    const user = userEvent.setup();
    stubLookups();
    const listSpy = vi.spyOn(auditsApi, "listAudits").mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 1,
    });
    vi.spyOn(auditsApi, "getAuditStats").mockResolvedValue({
      total: 0,
      scheduled: 0,
      completed: 0,
      upcoming: 0,
      byType: { Internal: 0, External: 0 },
    });

    renderAuditsPage();

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalled();
    });

    await user.selectOptions(
      screen.getByRole("combobox", { name: /filter by status/i }),
      "Completed"
    );

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "Internal",
          status: "Completed",
        })
      );
    });
  });
});

describe("Audits navigation", () => {
  it("lists Internal and External under Audits", () => {
    const audits = navigationSections[0]!.items.find(
      (item) => item.id === "audits"
    );
    expect(audits?.children?.map((c) => c.href)).toEqual([
      "/audits/internal",
      "/audits/external",
    ]);
    expect(breadcrumbsForPath("/audits/internal", navigationSections)).toEqual(
      [
        { label: "Dashboard", href: "/" },
        { label: "Audits" },
        { label: "Internal", href: "/audits/internal" },
      ]
    );
  });
});
