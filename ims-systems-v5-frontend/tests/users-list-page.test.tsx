import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@/shared/theme";
import { UsersListPage } from "@/modules/users";
import * as usersApi from "@/modules/users/api/users";
import type { UserWithMembership } from "@/modules/users/types";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function makeUserDetail(
  overrides: Partial<UserWithMembership["user"]> = {}
): UserWithMembership {
  return {
    user: {
      id: "100000000000000000000001",
      reference: "USR-DEMO-001",
      type: "Internal",
      firstName: "Ada",
      lastName: "Lovelace",
      name: "Ada Lovelace",
      email: "ada.lovelace@demo.local",
      emailVerified: { status: "verified", on: new Date().toISOString() },
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
      createdOn: new Date().toISOString(),
      deletedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    },
    membership: {
      userId: "100000000000000000000001",
      role: "Super User",
      jobTitle: "Head of Operations",
      groupIds: [],
      lineManagerIds: [],
    },
  };
}

function renderUsersPage(initial = "/users") {
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
            <Route path="/users" element={<UsersListPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

describe("UsersListPage user details", () => {
  it("opens user details from the row actions menu", async () => {
    const user = userEvent.setup();
    vi.spyOn(usersApi, "listUsers").mockResolvedValue({
      items: [
        {
          user: {
            id: "100000000000000000000001",
            reference: "USR-DEMO-001",
            name: "Ada Lovelace",
            email: "ada.lovelace@demo.local",
            systemAccess: { status: "Active" },
            loggedIn: { status: null, on: null },
          },
          membership: {
            userId: "100000000000000000000001",
            role: "Super User",
            jobTitle: "Head of Operations",
          },
        },
      ],
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    });
    const getUser = vi
      .spyOn(usersApi, "getUser")
      .mockResolvedValue(makeUserDetail());

    renderUsersPage();

    expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: /Actions for Ada Lovelace/i })
    );
    await user.click(await screen.findByRole("menuitem", { name: /Details/i }));

    expect(
      await screen.findByRole("heading", { name: /User details/i })
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(getUser).toHaveBeenCalledWith("100000000000000000000001");
    });
    expect(screen.getByText("USR-DEMO-001")).toBeInTheDocument();
    expect(screen.getAllByText("Head of Operations").length).toBeGreaterThan(0);
  }, 15_000);

  it("shows forbidden state in user details", async () => {
    const user = userEvent.setup();
    vi.spyOn(usersApi, "listUsers").mockResolvedValue({
      items: [
        {
          user: {
            id: "100000000000000000000001",
            reference: "USR-DEMO-001",
            name: "Ada Lovelace",
            email: "ada.lovelace@demo.local",
            systemAccess: { status: "Active" },
            loggedIn: { status: null, on: null },
          },
          membership: null,
        },
      ],
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    });
    const { ApiClientError } = await import("@/shared/lib/http/errors");
    vi.spyOn(usersApi, "getUser").mockRejectedValue(
      new ApiClientError({
        message: "Forbidden",
        status: 403,
        code: "FORBIDDEN",
      })
    );

    renderUsersPage();
    await user.click(
      await screen.findByRole("button", { name: /Actions for Ada Lovelace/i })
    );
    await user.click(await screen.findByRole("menuitem", { name: /Details/i }));

    expect(
      await screen.findByText(/do not have permission to view this user/i)
    ).toBeInTheDocument();
  });

  it("closes user details", async () => {
    const user = userEvent.setup();
    vi.spyOn(usersApi, "listUsers").mockResolvedValue({
      items: [
        {
          user: {
            id: "100000000000000000000001",
            reference: "USR-DEMO-001",
            name: "Ada Lovelace",
            email: "ada.lovelace@demo.local",
            systemAccess: { status: "Active" },
            loggedIn: { status: null, on: null },
          },
          membership: null,
        },
      ],
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    });
    vi.spyOn(usersApi, "getUser").mockResolvedValue(makeUserDetail());

    renderUsersPage("/users?user=100000000000000000000001");

    expect(
      await screen.findByRole("heading", { name: /User details/i })
    ).toBeInTheDocument();

    const closeButtons = screen.getAllByRole("button", { name: /^Close$/i });
    await user.click(closeButtons[closeButtons.length - 1]!);
    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: /User details/i })
      ).not.toBeInTheDocument();
    });
  });
});
