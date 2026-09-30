import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@/shared/theme";
import { OfisListPage } from "@/modules/ofi";
import * as ofiApi from "@/modules/ofi/api/ofi";
import * as usersApi from "@/modules/users/api/users";
import * as fuApi from "@/modules/functional-units/api/functional-units";
import * as tasksApi from "@/modules/tasks/api/tasks";
import type { Ofi } from "@/modules/ofi/types";
import { ApiClientError } from "@/shared/lib/http/errors";
import {
  breadcrumbsForPath,
  navigationSections,
} from "@/shared/navigation";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function makeOfi(overrides: Partial<Ofi> = {}): Ofi {
  const now = new Date().toISOString();
  return {
    id: "aaaaaaaaaaaaaaaaaaaaaaaa",
    organizationId: "000000000000000000000001",
    reference: "OFI-TEST-001",
    title: "Improve backup window",
    opportunityForImprovement: "Move backups off peak hours",
    ownerId: "bbbbbbbbbbbbbbbbbbbbbbbb",
    businessUnitId: "cccccccccccccccccccccccc",
    cost: 500,
    implemented: { status: "Pending", by: null, on: null },
    attachments: [],
    complianceLinks: [],
    activity: [],
    createdBy: "dev-stub-user",
    createdOn: now,
    updatedBy: null,
    updatedOn: null,
    nextNudgeAt: null,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
    displayStatus: "Pending",
    ...overrides,
  };
}

function renderOfisPage(initial = "/ofi") {
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
            <Route path="/ofi" element={<OfisListPage />} />
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
  vi.spyOn(tasksApi, "listTasks").mockResolvedValue({
    items: [],
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1,
  });
}

describe("OfisListPage", () => {
  it("shows loading then empty state", async () => {
    stubLookups();
    vi.spyOn(ofiApi, "listOfis").mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 1,
    });
    vi.spyOn(ofiApi, "getOfiStats").mockResolvedValue({
      total: 0,
      pending: 0,
      inProgress: 0,
      implemented: 0,
    });

    renderOfisPage();

    expect(screen.getByText(/loading ofis/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.getByText(/no ofis in the register yet/i)
      ).toBeInTheDocument();
    });
  });

  it("renders OFI rows with status", async () => {
    stubLookups();
    vi.spyOn(ofiApi, "listOfis").mockResolvedValue({
      items: [makeOfi()],
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    });
    vi.spyOn(ofiApi, "getOfiStats").mockResolvedValue({
      total: 1,
      pending: 1,
      inProgress: 0,
      implemented: 0,
    });
    vi.spyOn(ofiApi, "getOfi").mockResolvedValue(makeOfi());

    renderOfisPage();

    await waitFor(() => {
      expect(screen.getByText("Improve backup window")).toBeInTheDocument();
    });
    expect(screen.getAllByText("OFI-TEST-001").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Pending").length).toBeGreaterThan(0);
    expect(screen.getByRole("group", { name: /ofi summary/i })).toBeInTheDocument();
  });

  it("opens create sheet from Raise OFI", async () => {
    const user = userEvent.setup();
    stubLookups();
    vi.spyOn(ofiApi, "listOfis").mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 1,
    });
    vi.spyOn(ofiApi, "getOfiStats").mockResolvedValue({
      total: 0,
      pending: 0,
      inProgress: 0,
      implemented: 0,
    });

    renderOfisPage();

    await waitFor(() => {
      expect(
        screen.getByText(/no ofis in the register yet/i)
      ).toBeInTheDocument();
    });

    await user.click(screen.getAllByRole("button", { name: /raise ofi/i })[0]!);
    expect(
      await screen.findByRole("heading", { name: /^raise ofi$/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/^title$/i)).toBeInTheDocument();
  }, 15_000);

  it("opens details with implement and nudge actions", async () => {
    const user = userEvent.setup();
    stubLookups();
    const ofi = makeOfi();
    vi.spyOn(ofiApi, "listOfis").mockResolvedValue({
      items: [ofi],
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    });
    vi.spyOn(ofiApi, "getOfiStats").mockResolvedValue({
      total: 1,
      pending: 1,
      inProgress: 0,
      implemented: 0,
    });
    vi.spyOn(ofiApi, "getOfi").mockResolvedValue(ofi);

    renderOfisPage();

    await waitFor(() => {
      expect(screen.getByText("Improve backup window")).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole("button", {
        name: /actions for improve backup window/i,
      })
    );
    await user.click(await screen.findByRole("menuitem", { name: /details/i }));

    expect(
      await screen.findByRole("button", { name: /^edit$/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^implement$/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^nudge$/i })).toBeInTheDocument();
    expect(
      screen.getByText(/the first activity moves this ofi/i)
    ).toBeInTheDocument();
  }, 15_000);

  it("hides lifecycle actions when implemented", async () => {
    const user = userEvent.setup();
    stubLookups();
    const ofi = makeOfi({
      implemented: {
        status: "Implemented",
        by: "bbbbbbbbbbbbbbbbbbbbbbbb",
        on: new Date().toISOString(),
      },
      displayStatus: "Implemented",
    });
    vi.spyOn(ofiApi, "listOfis").mockResolvedValue({
      items: [ofi],
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    });
    vi.spyOn(ofiApi, "getOfiStats").mockResolvedValue({
      total: 1,
      pending: 0,
      inProgress: 0,
      implemented: 1,
    });
    vi.spyOn(ofiApi, "getOfi").mockResolvedValue(ofi);

    renderOfisPage();

    await waitFor(() => {
      expect(screen.getByText("Improve backup window")).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole("button", {
        name: /actions for improve backup window/i,
      })
    );
    await user.click(await screen.findByRole("menuitem", { name: /details/i }));

    await waitFor(() => {
      expect(screen.getAllByText("Implemented").length).toBeGreaterThan(0);
    });
    expect(
      screen.queryByRole("button", { name: /^edit$/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^implement$/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^nudge$/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^delete$/i })
    ).not.toBeInTheDocument();
  }, 15_000);

  it("shows forbidden state", async () => {
    stubLookups();
    vi.spyOn(ofiApi, "listOfis").mockRejectedValue(
      new ApiClientError({
        message: "Forbidden",
        status: 403,
        code: "FORBIDDEN",
      })
    );
    vi.spyOn(ofiApi, "getOfiStats").mockResolvedValue({
      total: 0,
      pending: 0,
      inProgress: 0,
      implemented: 0,
    });

    renderOfisPage();

    await waitFor(() => {
      expect(
        screen.getByText(/you do not have permission to view ofis/i)
      ).toBeInTheDocument();
    });
  });

  it("filters by status", async () => {
    const user = userEvent.setup();
    stubLookups();
    const listSpy = vi.spyOn(ofiApi, "listOfis").mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 1,
    });
    vi.spyOn(ofiApi, "getOfiStats").mockResolvedValue({
      total: 0,
      pending: 0,
      inProgress: 0,
      implemented: 0,
    });

    renderOfisPage();

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalled();
    });

    await user.selectOptions(
      screen.getByRole("combobox", { name: /filter by status/i }),
      "In Progress"
    );

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledWith(
        expect.objectContaining({ status: "In Progress" })
      );
    });
  });
});

describe("OFI navigation", () => {
  it("is listed as a top-level workspace item", () => {
    const ofi = navigationSections[0]!.items.find((item) => item.id === "ofi");
    expect(ofi?.href).toBe("/ofi");
    expect(breadcrumbsForPath("/ofi", navigationSections)).toEqual([
      { label: "Dashboard", href: "/" },
      { label: "OFI", href: "/ofi" },
    ]);
  });
});
