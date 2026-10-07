import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@/shared/theme";
import { ApplicationShell } from "@/shared/layout";
import { MyOrganisationPage } from "@/modules/organisation";
import { MyProfilePage } from "@/modules/users";
import * as usersApi from "@/modules/users/api/users";
import * as fuApi from "@/modules/functional-units/api/functional-units";
import * as orgApi from "@/modules/organisation/api/organisations";
import type { UserWithMembership } from "@/modules/users/types";
import type { OrganisationProfile } from "@/modules/organisation/types";
import {
  breadcrumbsForPath,
  navigationSections,
} from "@/shared/navigation";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function makeUserDetail(): UserWithMembership {
  const now = new Date().toISOString();
  return {
    user: {
      id: "100000000000000000000001",
      reference: "USR-DEMO-001",
      type: "Internal",
      firstName: "Ada",
      lastName: "Lovelace",
      name: "Ada Lovelace",
      email: "ada.lovelace@demo.local",
      emailVerified: { status: "verified", on: now },
      phone: "",
      phoneVerified: { status: "pending", on: null },
      systemPasswordStatus: "active",
      systemAccess: {
        status: "Active",
        period: "Full time",
        expires: null,
        updatedOn: null,
      },
      accessPolicies: [],
      profileImage: {
        url: "https://assets.imssystems.tech/images/system/avatar-placeholder.jpg",
      },
      signatureInfo: {},
      preferences: { darkMode: false, activeTheme: "slate" },
      country: { name: "United Kingdom", code: "GB" },
      locations: [],
      loggedIn: { status: null, on: null },
      createdBy: "demo-seed",
      createdOn: now,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    },
    membership: {
      userId: "100000000000000000000001",
      role: "Super User",
      jobTitle: "Head of Operations",
      groupIds: ["200000000000000000000001"],
      lineManagerIds: [],
    },
  };
}

function stubOrganisation() {
  const now = new Date().toISOString();
  const profile: OrganisationProfile = {
    id: "000000000000000000000001",
    reference: "ORG-DEV-001",
    name: "Demo Organisation",
    industry: "Information technology",
    sizeOfOrganisation: 120,
    officeEmail: "ops@demo.local",
    contactNumber: "+44 20 7946 0000",
    companyNumber: "12345678",
    vatNumber: "GB123456789",
    address: {
      line1: "1 Demo Street",
      line2: "",
      city: "London",
      county: "Greater London",
      postCode: "EC2A 4BX",
      country: "United Kingdom",
    },
    country: {
      name: "United Kingdom",
      code: "GB",
      currency: "GBP",
      phoneCode: 44,
    },
    isCustomer: true,
    isPartner: false,
    status: "Running",
    licences: {
      superUser: { allocated: 5, used: 2 },
      users: { allocated: 25, used: 6 },
      groups: { allocated: 10, used: 5 },
    },
    referralSource: null,
    logoSrc: null,
    createdBy: "demo-seed",
    createdOn: now,
    createdAt: now,
    updatedAt: now,
    membership: {
      id: "cccccccccccccccccccccccc",
      organizationId: "000000000000000000000001",
      userId: "dev-stub-user",
      role: "Super Admin",
      jobTitle: "Platform operator",
      createdOn: now,
      createdAt: now,
      updatedAt: now,
    },
  };
  vi.spyOn(orgApi, "getCurrentOrganisation").mockResolvedValue(profile);
}

function stubFunctionalUnits() {
  const now = new Date().toISOString();
  vi.spyOn(fuApi, "listFunctionalUnits").mockResolvedValue({
    items: [
      {
        id: "200000000000000000000001",
        organizationId: "000000000000000000000001",
        reference: "FU-OPS",
        name: "Operations",
        accessType: "Internal business function",
        responsibility: "Ops",
        totalMembers: 3,
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
      },
    ],
    page: 1,
    pageSize: 100,
    total: 1,
    totalPages: 1,
  });
}

function renderShell(initial = "/") {
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
            <Route element={<ApplicationShell />}>
              <Route
                index
                element={<p>Dashboard home</p>}
              />
              <Route path="profile" element={<MyProfilePage />} />
              <Route path="organisation" element={<MyOrganisationPage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

describe("Account menu", () => {
  it("exposes profile and organisation links; defers password and logout", async () => {
    const user = userEvent.setup();
    vi.spyOn(usersApi, "getUser").mockResolvedValue(makeUserDetail());
    vi.spyOn(usersApi, "listUsers").mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 1,
      total: 6,
      totalPages: 6,
    });

    renderShell();

    await user.click(
      await screen.findByRole("button", { name: /open account menu/i })
    );

    expect(
      await screen.findByRole("menuitem", { name: /my profile/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: /my organisation/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: /change password/i })
    ).toHaveAttribute("data-disabled");
    expect(
      screen.getByRole("menuitem", { name: /^logout$/i })
    ).toHaveAttribute("data-disabled");
  });

  it("opens my profile from the account menu", async () => {
    const user = userEvent.setup();
    stubFunctionalUnits();
    vi.spyOn(usersApi, "getUser").mockResolvedValue(makeUserDetail());
    vi.spyOn(usersApi, "listUsers").mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 1,
      total: 6,
      totalPages: 6,
    });

    renderShell();

    await user.click(
      await screen.findByRole("button", { name: /open account menu/i })
    );
    await user.click(
      await screen.findByRole("menuitem", { name: /my profile/i })
    );

    expect(
      await screen.findByRole("heading", { name: /^my profile$/i })
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    });
    expect(usersApi.getUser).toHaveBeenCalledWith(
      "100000000000000000000001"
    );
    expect(
      await screen.findByRole("heading", { name: /^business units$/i })
    ).toBeInTheDocument();
    expect(await screen.findByText("Operations")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /edit profile/i })
    ).toBeInTheDocument();
  });

  it("opens my organisation from the account menu", async () => {
    const user = userEvent.setup();
    stubOrganisation();
    vi.spyOn(usersApi, "getUser").mockResolvedValue(makeUserDetail());
    vi.spyOn(usersApi, "listUsers").mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 1,
      total: 6,
      totalPages: 6,
    });

    renderShell();

    await user.click(
      await screen.findByRole("button", { name: /open account menu/i })
    );
    await user.click(
      await screen.findByRole("menuitem", { name: /my organisation/i })
    );

    expect(
      await screen.findByRole("heading", { name: /^my organisation$/i })
    ).toBeInTheDocument();
    expect(screen.getAllByText("Demo Organisation").length).toBeGreaterThan(0);
    expect(screen.getByText("ORG-DEV-001")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /^basic information$/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /^contact & address$/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /^directory$/i })
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("6")).toBeInTheDocument();
    });
  });

  it("builds breadcrumbs for account routes", () => {
    expect(breadcrumbsForPath("/profile", navigationSections)).toEqual([
      { label: "Dashboard", href: "/" },
      { label: "My Profile", href: "/profile" },
    ]);
    expect(breadcrumbsForPath("/organisation", navigationSections)).toEqual([
      { label: "Dashboard", href: "/" },
      { label: "My organisation", href: "/organisation" },
    ]);
  });
});
