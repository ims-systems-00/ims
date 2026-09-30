import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { FunctionalUnitMembersPanel } from "@/modules/functional-units/components/functional-unit-members-panel";
import type { FunctionalUnit } from "@/modules/functional-units/types";
import { ThemeProvider } from "@/shared/theme";

const listMembers = vi.fn();
const listEligible = vi.fn();
const addMembers = vi.fn();
const removeMember = vi.fn();
const getUser = vi.fn();

vi.mock("@/modules/functional-units/api/functional-units", async () => {
  const actual = await vi.importActual<
    typeof import("@/modules/functional-units/api/functional-units")
  >("@/modules/functional-units/api/functional-units");
  return {
    ...actual,
    listFunctionalUnitMembers: (...args: unknown[]) => listMembers(...args),
    listEligibleFunctionalUnitMembers: (...args: unknown[]) =>
      listEligible(...args),
    addFunctionalUnitMembers: (...args: unknown[]) => addMembers(...args),
    removeFunctionalUnitMember: (...args: unknown[]) => removeMember(...args),
  };
});

vi.mock("@/modules/users/api/users", async () => {
  const actual = await vi.importActual<
    typeof import("@/modules/users/api/users")
  >("@/modules/users/api/users");
  return {
    ...actual,
    getUser: (...args: unknown[]) => getUser(...args),
  };
});

function makeUnit(overrides: Partial<FunctionalUnit> = {}): FunctionalUnit {
  return {
    id: "aaaaaaaaaaaaaaaaaaaaaaaa",
    organizationId: "000000000000000000000001",
    reference: "FU-1",
    name: "Operations",
    accessType: "Internal business function",
    responsibility: "Ops",
    operatingLocation: "London",
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
    ...overrides,
  };
}

function renderPanel(unit: FunctionalUnit) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <MemoryRouter>
          <FunctionalUnitMembersPanel unit={unit} />
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

describe("FunctionalUnitMembersPanel", () => {
  beforeEach(() => {
    listMembers.mockReset();
    listEligible.mockReset();
    addMembers.mockReset();
    removeMember.mockReset();
    getUser.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows empty members state", async () => {
    listMembers.mockResolvedValue({ items: [] });
    renderPanel(makeUnit());
    expect(await screen.findByText(/No members assigned/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Add members/i })
    ).toBeInTheDocument();
  });

  it("lists members and confirms removal", async () => {
    const user = userEvent.setup();
    listMembers.mockResolvedValue({
      items: [
        {
          id: "cccccccccccccccccccccccc",
          reference: "USR-1",
          name: "Ada Lovelace",
          email: "ada@example.com",
          jobTitle: "Engineer",
          role: "Basic User",
          systemAccessStatus: "Active",
          profileImageUrl: "",
          lastLoggedIn: null,
        },
      ],
    });
    removeMember.mockResolvedValue({
      message: "ok",
      unit: makeUnit({ totalMembers: 0 }),
    });

    renderPanel(makeUnit({ totalMembers: 1 }));
    expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /Remove member Ada Lovelace/i })
    );
    expect(
      await screen.findByText(/will be removed from Operations/i)
    ).toBeInTheDocument();

    const confirmButtons = screen.getAllByRole("button", {
      name: /^Remove member$/i,
    });
    await user.click(confirmButtons[confirmButtons.length - 1]!);
    await waitFor(() => {
      expect(removeMember).toHaveBeenCalledWith(
        "aaaaaaaaaaaaaaaaaaaaaaaa",
        "cccccccccccccccccccccccc"
      );
    });
  });

  it("opens shared user details when a member is selected", async () => {
    const user = userEvent.setup();
    listMembers.mockResolvedValue({
      items: [
        {
          id: "cccccccccccccccccccccccc",
          reference: "USR-1",
          name: "Ada Lovelace",
          email: "ada@example.com",
          jobTitle: "Engineer",
          role: "Basic User",
          systemAccessStatus: "Active",
          profileImageUrl: "",
          lastLoggedIn: null,
        },
      ],
    });
    getUser.mockResolvedValue({
      user: {
        id: "cccccccccccccccccccccccc",
        reference: "USR-1",
        type: "Internal",
        firstName: "Ada",
        lastName: "Lovelace",
        name: "Ada Lovelace",
        email: "ada@example.com",
        emailVerified: { status: "verified", on: null },
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
        profileImage: { url: "" },
        signatureInfo: {},
        preferences: { darkMode: false, activeTheme: "slate" },
        country: { name: "United Kingdom", code: "GB" },
        locations: [],
        loggedIn: { status: null, on: null },
        createdBy: null,
        createdOn: null,
        deletedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      membership: {
        userId: "cccccccccccccccccccccccc",
        role: "Basic User",
        jobTitle: "Engineer",
      },
    });

    renderPanel(makeUnit({ totalMembers: 1 }));
    expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /Ada Lovelace.*View details/i })
    );

    expect(
      await screen.findByRole("heading", { name: /User details/i })
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(getUser).toHaveBeenCalledWith("cccccccccccccccccccccccc");
    });
    expect(await screen.findByText("Engineer")).toBeInTheDocument();
  });

  it("adds a selected eligible user", async () => {
    const user = userEvent.setup();
    listMembers.mockResolvedValue({ items: [] });
    listEligible.mockResolvedValue({
      items: [
        {
          id: "cccccccccccccccccccccccc",
          reference: "USR-1",
          name: "Grace Hopper",
          email: "grace@example.com",
          jobTitle: null,
          role: "Basic User",
          systemAccessStatus: "Active",
          profileImageUrl: "",
          lastLoggedIn: null,
        },
      ],
    });
    addMembers.mockResolvedValue({
      message: "ok",
      members: [],
      unit: makeUnit({ totalMembers: 1 }),
    });

    renderPanel(makeUnit());
    expect(await screen.findByText(/No members assigned/i)).toBeInTheDocument();
    const addButtons = screen.getAllByRole("button", { name: /Add members/i });
    await user.click(addButtons[0]!);
    expect(await screen.findByText("Grace Hopper")).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /^Confirm$/i }));

    await waitFor(() => {
      expect(addMembers).toHaveBeenCalledWith("aaaaaaaaaaaaaaaaaaaaaaaa", [
        "cccccccccccccccccccccccc",
      ]);
    });
  });
});
