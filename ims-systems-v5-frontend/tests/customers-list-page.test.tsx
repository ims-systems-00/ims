import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@/shared/theme";
import { CustomersListPage, CustomersOverviewPage } from "@/modules/customers";
import * as customersApi from "@/modules/customers/api/customers";
import * as usersApi from "@/modules/users/api/users";
import * as fuApi from "@/modules/functional-units/api/functional-units";
import * as tasksApi from "@/modules/tasks/api/tasks";
import * as incidentsApi from "@/modules/incidents/api/incidents";
import type { Customer } from "@/modules/customers/types";
import { ApiClientError } from "@/shared/lib/http/errors";
import { DEV_STUB_IDENTITY } from "@/security";
import {
  breadcrumbsForPath,
  navigationSections,
} from "@/shared/navigation";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function makeCustomer(overrides: Partial<Customer> = {}): Customer {
  const now = new Date().toISOString();
  return {
    id: "aaaaaaaaaaaaaaaaaaaaaaaa",
    organizationId: "000000000000000000000001",
    reference: "CUS-TEST-001",
    name: "Acme Care Ltd",
    stage: "Prospect",
    status: "Open",
    probability: 10,
    primaryEmail: "hello@acme.example",
    contractValue: 12000,
    accountManager: "bbbbbbbbbbbbbbbbbbbbbbbb",
    businessUnitId: "cccccccccccccccccccccccc",
    isChampion: false,
    logo: {
      src: "https://assets.imssystems.tech/images/system/avatar-placeholder.jpg",
    },
    attachments: [],
    createdBy: "dev-stub-user",
    createdOn: now,
    updatedBy: null,
    updatedOn: null,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function renderCustomersPage(initial = "/customers") {
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
            <Route path="/customers" element={<CustomersListPage />} />
            <Route
              path="/customers/overview"
              element={<CustomersOverviewPage />}
            />
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
  vi.spyOn(incidentsApi, "listIncidents").mockResolvedValue({
    items: [],
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1,
  });
}

describe("CustomersListPage", () => {
  it("shows loading then empty state", async () => {
    stubLookups();
    vi.spyOn(customersApi, "listCustomers").mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 1,
    });

    renderCustomersPage();

    expect(screen.getByText(/loading customers/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.getByText(/no customers in the register yet/i)
      ).toBeInTheDocument();
    });
  });

  it("renders customer rows with stage", async () => {
    stubLookups();
    vi.spyOn(customersApi, "listCustomers").mockResolvedValue({
      items: [makeCustomer()],
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    });
    vi.spyOn(customersApi, "getCustomer").mockResolvedValue(makeCustomer());

    renderCustomersPage();

    await waitFor(() => {
      expect(screen.getByText("Acme Care Ltd")).toBeInTheDocument();
    });
    expect(screen.getAllByText("CUS-TEST-001").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Prospect").length).toBeGreaterThan(0);
  });

  it("opens create sheet from Register customer", async () => {
    const user = userEvent.setup();
    stubLookups();
    vi.spyOn(customersApi, "listCustomers").mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 1,
    });

    renderCustomersPage();

    await waitFor(() => {
      expect(
        screen.getByText(/no customers in the register yet/i)
      ).toBeInTheDocument();
    });

    await user.click(
      screen.getAllByRole("button", { name: /register customer/i })[0]!
    );
    expect(
      await screen.findByRole("heading", { name: /^register customer$/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/^organisation name$/i)).toBeInTheDocument();
  }, 15_000);

  it("opens details with edit action", async () => {
    const user = userEvent.setup();
    stubLookups();
    const customer = makeCustomer();
    vi.spyOn(customersApi, "listCustomers").mockResolvedValue({
      items: [customer],
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    });
    vi.spyOn(customersApi, "getCustomer").mockResolvedValue(customer);
    vi.spyOn(customersApi, "getCustomerOverview").mockResolvedValue({
      totalInvoices: 0,
      totalIncidents: [],
      totalInvoiceAmount: [],
    });

    renderCustomersPage();

    await waitFor(() => {
      expect(screen.getByText("Acme Care Ltd")).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole("button", {
        name: /actions for acme care ltd/i,
      })
    );
    await user.click(await screen.findByRole("menuitem", { name: /details/i }));

    expect(
      await screen.findByRole("button", { name: /^edit$/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/contact & address/i)).toBeInTheDocument();
  }, 15_000);

  it("shows forbidden state", async () => {
    stubLookups();
    vi.spyOn(customersApi, "listCustomers").mockRejectedValue(
      new ApiClientError({
        message: "Forbidden",
        status: 403,
        code: "FORBIDDEN",
      })
    );

    renderCustomersPage();

    await waitFor(() => {
      expect(
        screen.getByText(/you do not have permission to view customers/i)
      ).toBeInTheDocument();
    });
  });

  it("filters by my customers preset", async () => {
    const user = userEvent.setup();
    stubLookups();
    const listSpy = vi.spyOn(customersApi, "listCustomers").mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 1,
    });

    renderCustomersPage();

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalled();
    });

    await user.click(screen.getByRole("button", { name: /^my customers$/i }));

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledWith(
        expect.objectContaining({ myCustomers: true })
      );
    });
  });
});

describe("CustomersOverviewPage", () => {
  it("loads MY CRM overview for session user", async () => {
    stubLookups();
    vi.spyOn(customersApi, "getAccountManagerOverview").mockResolvedValue({
      customerAnalysis: [
        { stage: "Prospect", count: 2, contractValue: 10000 },
      ],
      invoiceAnalysis: [],
      contractStartedThisMonth: 1,
      contractEndingThisMonth: 0,
      contractReviewThisMonth: 0,
      highestValueCustomer: {
        name: "Acme Care Ltd",
        value: 12000,
        stage: "Prospect",
      },
      mostValuedLiveCustomer: {
        name: "Not available",
        value: 0,
        stage: "",
      },
      lessValuedLiveCustomer: {
        name: "Not available",
        value: 0,
        stage: "",
      },
      activeCampaign: 0,
      closedCampaign: 0,
      monthlyCampaign: [],
      latestCampaign: "No recent campaign",
      interactions: {
        weekly: {
          totalInteractions: 0,
          customersEngaged: 0,
          topCustomers: [],
        },
        monthly: {
          totalInteractions: 0,
          customersEngaged: 0,
          topCustomers: [],
        },
      },
    });

    renderCustomersPage("/customers/overview");

    await waitFor(() => {
      expect(screen.getByText(/customers by stage/i)).toBeInTheDocument();
    });
    expect(customersApi.getAccountManagerOverview).toHaveBeenCalledWith(
      DEV_STUB_IDENTITY.subjectId
    );
    expect(screen.getByText("MY CRM")).toBeInTheDocument();
  });
});

describe("CRM navigation", () => {
  it("includes Customers and MY CRM under CRM", () => {
    const crm = navigationSections[0]!.items.find((item) => item.id === "crm");
    expect(crm?.children?.map((child) => child.href)).toEqual([
      "/customers/overview",
      "/customers",
    ]);
    expect(breadcrumbsForPath("/customers", navigationSections)).toEqual([
      { label: "Dashboard", href: "/" },
      { label: "CRM" },
      { label: "Customers", href: "/customers" },
    ]);
  });
});
