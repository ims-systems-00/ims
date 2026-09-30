import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@/shared/theme";
import { SuppliersListPage } from "@/modules/suppliers";
import * as suppliersApi from "@/modules/suppliers/api/suppliers";
import * as usersApi from "@/modules/users/api/users";
import * as fuApi from "@/modules/functional-units/api/functional-units";
import * as tasksApi from "@/modules/tasks/api/tasks";
import * as incidentsApi from "@/modules/incidents/api/incidents";
import type { Supplier } from "@/modules/suppliers/types";
import { ApiClientError } from "@/shared/lib/http/errors";
import {
  breadcrumbsForPath,
  navigationSections,
} from "@/shared/navigation";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function makeSupplier(overrides: Partial<Supplier> = {}): Supplier {
  const now = new Date().toISOString();
  return {
    id: "aaaaaaaaaaaaaaaaaaaaaaaa",
    organizationId: "000000000000000000000001",
    reference: "SUP-TEST-001",
    name: "Acme Facilities Ltd",
    businessUnitId: "cccccccccccccccccccccccc",
    accountManager: "Jane Contact",
    accountNumber: "ACC-1001",
    email: "ops@acme.example",
    buyerId: "bbbbbbbbbbbbbbbbbbbbbbbb",
    serviceProvision: "Facilities maintenance",
    contractValue: 25000,
    contractStartDate: now,
    contractEndDate: null,
    reviewDate: null,
    slaFiles: [],
    contractFiles: [],
    onboardingFiles: [],
    kpiObjectives: [],
    isCompliant: false,
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

function renderSuppliersPage(initial = "/suppliers") {
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
            <Route path="/suppliers" element={<SuppliersListPage />} />
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

describe("SuppliersListPage", () => {
  it("shows loading then empty state", async () => {
    stubLookups();
    vi.spyOn(suppliersApi, "listSuppliers").mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 1,
    });
    vi.spyOn(suppliersApi, "getSupplierStats").mockResolvedValue({
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
    });

    renderSuppliersPage();

    expect(screen.getByText(/loading suppliers/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.getByText(/no suppliers in the register yet/i)
      ).toBeInTheDocument();
    });
  });

  it("renders supplier rows with compliance", async () => {
    stubLookups();
    vi.spyOn(suppliersApi, "listSuppliers").mockResolvedValue({
      items: [makeSupplier({ isCompliant: true })],
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    });
    vi.spyOn(suppliersApi, "getSupplierStats").mockResolvedValue({
      procurementValue: 25000,
      supplierIncidents: {
        totalIncidents: 0,
        openIncidents: 0,
        resolvedIncidents: 0,
      },
      supplierCompliance: {
        compliant: 1,
        inCompliant: 0,
        percentage: 100,
        riskLevel: "Safe",
      },
    });
    vi.spyOn(suppliersApi, "getSupplier").mockResolvedValue(
      makeSupplier({ isCompliant: true })
    );

    renderSuppliersPage();

    await waitFor(() => {
      expect(screen.getByText("Acme Facilities Ltd")).toBeInTheDocument();
    });
    expect(screen.getAllByText("SUP-TEST-001").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Compliant").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("group", { name: /supplier summary/i })
    ).toBeInTheDocument();
  });

  it("opens create sheet from Register supplier", async () => {
    const user = userEvent.setup();
    stubLookups();
    vi.spyOn(suppliersApi, "listSuppliers").mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 1,
    });
    vi.spyOn(suppliersApi, "getSupplierStats").mockResolvedValue({
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
    });

    renderSuppliersPage();

    await waitFor(() => {
      expect(
        screen.getByText(/no suppliers in the register yet/i)
      ).toBeInTheDocument();
    });

    await user.click(
      screen.getAllByRole("button", { name: /register supplier/i })[0]!
    );
    expect(
      await screen.findByRole("heading", { name: /^register supplier$/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/^supplier name$/i)).toBeInTheDocument();
  }, 15_000);

  it("opens details with edit and delete actions", async () => {
    const user = userEvent.setup();
    stubLookups();
    const supplier = makeSupplier();
    vi.spyOn(suppliersApi, "listSuppliers").mockResolvedValue({
      items: [supplier],
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    });
    vi.spyOn(suppliersApi, "getSupplierStats").mockResolvedValue({
      procurementValue: 25000,
      supplierIncidents: {
        totalIncidents: 0,
        openIncidents: 0,
        resolvedIncidents: 0,
      },
      supplierCompliance: {
        compliant: 0,
        inCompliant: 1,
        percentage: 0,
        riskLevel: "Hazardous",
      },
    });
    vi.spyOn(suppliersApi, "getSupplier").mockResolvedValue(supplier);

    renderSuppliersPage();

    await waitFor(() => {
      expect(screen.getByText("Acme Facilities Ltd")).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole("button", {
        name: /actions for acme facilities ltd/i,
      })
    );
    await user.click(await screen.findByRole("menuitem", { name: /details/i }));

    expect(
      await screen.findByRole("button", { name: /^edit$/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^delete$/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /^kpi objectives$/i })
    ).toBeInTheDocument();
  }, 15_000);

  it("shows forbidden state", async () => {
    stubLookups();
    vi.spyOn(suppliersApi, "listSuppliers").mockRejectedValue(
      new ApiClientError({
        message: "Forbidden",
        status: 403,
        code: "FORBIDDEN",
      })
    );
    vi.spyOn(suppliersApi, "getSupplierStats").mockResolvedValue({
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
    });

    renderSuppliersPage();

    await waitFor(() => {
      expect(
        screen.getByText(/you do not have permission to view suppliers/i)
      ).toBeInTheDocument();
    });
  });

  it("filters by compliance", async () => {
    const user = userEvent.setup();
    stubLookups();
    const listSpy = vi.spyOn(suppliersApi, "listSuppliers").mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 1,
    });
    vi.spyOn(suppliersApi, "getSupplierStats").mockResolvedValue({
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
    });

    renderSuppliersPage();

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalled();
    });

    await user.selectOptions(
      screen.getByRole("combobox", { name: /filter by compliance/i }),
      "true"
    );

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledWith(
        expect.objectContaining({ isCompliant: true })
      );
    });
  });
});

describe("Suppliers navigation", () => {
  it("is listed as a top-level workspace item", () => {
    const suppliers = navigationSections[0]!.items.find(
      (item) => item.id === "suppliers"
    );
    expect(suppliers?.href).toBe("/suppliers");
    expect(breadcrumbsForPath("/suppliers", navigationSections)).toEqual([
      { label: "Dashboard", href: "/" },
      { label: "Suppliers", href: "/suppliers" },
    ]);
  });
});
