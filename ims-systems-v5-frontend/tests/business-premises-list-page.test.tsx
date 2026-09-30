import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@/shared/theme";
import { BusinessPremisesListPage } from "@/modules/business-premise";
import * as bpApi from "@/modules/business-premise/api/business-premises";
import * as fuApi from "@/modules/functional-units/api/functional-units";
import type { BusinessPremise } from "@/modules/business-premise/types";
import { ApiClientError } from "@/shared/lib/http/errors";
import {
  breadcrumbsForPath,
  isNavBranchActive,
  navigationSections,
} from "@/shared/navigation";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function makePremise(
  overrides: Partial<BusinessPremise> = {}
): BusinessPremise {
  const now = new Date().toISOString();
  return {
    id: "aaaaaaaaaaaaaaaaaaaaaaaa",
    organizationId: "000000000000000000000001",
    reference: "",
    name: "Head Office",
    location: "Manchester",
    address: "1 Market Street",
    functionalUnitIds: ["cccccccccccccccccccccccc"],
    createdBy: "bbbbbbbbbbbbbbbbbbbbbbbb",
    createdOn: now,
    updatedBy: null,
    updatedOn: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function stubUnits() {
  vi.spyOn(fuApi, "listFunctionalUnits").mockResolvedValue({
    items: [
      {
        id: "cccccccccccccccccccccccc",
        organizationId: "000000000000000000000001",
        reference: "FU-1",
        name: "Operations",
        accessType: "Internal business function",
        responsibility: "Ops",
        operatingLocation: "Manchester",
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    page: 1,
    pageSize: 100,
    total: 1,
    totalPages: 1,
  });
}

function renderPage(initial = "/business-premises") {
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
              path="/business-premises"
              element={<BusinessPremisesListPage />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

describe("Business Premises list page", () => {
  it("is nested under Organisation navigation", () => {
    const organisation = navigationSections[0]!.items.find(
      (item) => item.id === "organisation"
    )!;
    const premises = organisation.children?.find(
      (item) => item.id === "business-premises"
    );
    expect(premises?.href).toBe("/business-premises");
    expect(isNavBranchActive("/business-premises", organisation)).toBe(true);
    expect(
      breadcrumbsForPath("/business-premises", navigationSections)
    ).toEqual([
      { label: "Dashboard", href: "/" },
      { label: "Organisation" },
      { label: "Business Premises", href: "/business-premises" },
    ]);
  });

  it("renders premises from the list API", async () => {
    stubUnits();
    vi.spyOn(bpApi, "listBusinessPremises").mockResolvedValue({
      items: [makePremise()],
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Head Office")).toBeInTheDocument();
    });
    expect(screen.getByText("Manchester")).toBeInTheDocument();
    expect(screen.getByText("1 Market Street")).toBeInTheDocument();
  });

  it("shows empty state when no premises exist", async () => {
    stubUnits();
    vi.spyOn(bpApi, "listBusinessPremises").mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 0,
    });

    renderPage();

    await waitFor(() => {
      expect(
        screen.getByText(/no business premises yet/i)
      ).toBeInTheDocument();
    });
  });

  it("shows forbidden error state", async () => {
    stubUnits();
    vi.spyOn(bpApi, "listBusinessPremises").mockRejectedValue(
      new ApiClientError({
        message: "Forbidden",
        status: 403,
        code: "FORBIDDEN",
      })
    );

    renderPage();

    await waitFor(() => {
      expect(
        screen.getByText(
          /you do not have permission to view business premises/i
        )
      ).toBeInTheDocument();
    });
  });

  it("opens create sheet from the toolbar", async () => {
    const user = userEvent.setup();
    stubUnits();
    vi.spyOn(bpApi, "listBusinessPremises").mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 0,
    });

    renderPage();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /create premise/i })
      ).toBeInTheDocument();
    });

    await user.click(
      screen.getAllByRole("button", { name: /create premise/i })[0]!
    );

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /create business premise/i })
      ).toBeInTheDocument();
    });
  });

  it("opens details sheet from row actions", async () => {
    const user = userEvent.setup();
    stubUnits();
    const premise = makePremise();
    vi.spyOn(bpApi, "listBusinessPremises").mockResolvedValue({
      items: [premise],
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    });
    vi.spyOn(bpApi, "getBusinessPremise").mockResolvedValue(premise);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Head Office")).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole("button", { name: /actions for head office/i })
    );
    await user.click(await screen.findByRole("menuitem", { name: /details/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^edit$/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^delete$/i })).toBeInTheDocument();
      expect(screen.getAllByText("Operations").length).toBeGreaterThan(0);
      expect(screen.getByText("Site")).toBeInTheDocument();
    });
  });

  it("passes search to the list API", async () => {
    const user = userEvent.setup();
    stubUnits();
    const listSpy = vi.spyOn(bpApi, "listBusinessPremises").mockResolvedValue({
      items: [makePremise()],
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Head Office")).toBeInTheDocument();
    });

    const search = screen.getByRole("searchbox", {
      name: /search business premises/i,
    });
    await user.clear(search);
    await user.type(search, "warehouse");

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledWith(
        expect.objectContaining({ search: "warehouse" })
      );
    });
  });
});
