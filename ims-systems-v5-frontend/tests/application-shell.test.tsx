import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { cleanup, render, screen, within } from "@testing-library/react";
import { ApplicationShell } from "@/shared/layout";
import { ThemeProvider } from "@/shared/theme";

vi.mock("@/modules/notifications", () => ({
  NotificationBell: () => (
    <button type="button" aria-label="Notifications">
      Notifications
    </button>
  ),
  NotificationPopupQueue: () => null,
}));

vi.mock("@/modules/users/hooks/use-users", () => ({
  useUserQuery: () => ({
    data: {
      id: "u1",
      name: "Test User",
      email: "test@example.com",
    },
    isLoading: false,
    isError: false,
  }),
}));

afterEach(() => {
  cleanup();
});

function renderShell(initialPath = "/") {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchOnWindowFocus: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route element={<ApplicationShell />}>
              <Route index element={<div>Dashboard content</div>} />
              <Route
                path="functional-units"
                element={<div>Functional units content</div>}
              />
              <Route path="users" element={<div>Users content</div>} />
              <Route path="risks" element={<div>Risks content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

describe("ApplicationShell", () => {
  it("renders primary navigation and outlet content", () => {
    renderShell("/");
    const primaryNav = screen.getByRole("navigation", { name: /primary/i });
    expect(primaryNav).toBeInTheDocument();
    expect(
      within(primaryNav).getByRole("link", { name: /live dashboard/i })
    ).toBeInTheDocument();
    expect(screen.getByText("Dashboard content")).toBeInTheDocument();
  });

  it("keeps the shell viewport-locked so only main content scrolls", () => {
    const { container } = renderShell("/");
    const shell = container.firstElementChild as HTMLElement;
    expect(shell.className).toMatch(/h-dvh/);
    expect(shell.className).toMatch(/overflow-hidden/);
    expect(screen.getByRole("main").className).toMatch(/overflow-y-auto/);
  });

  it("auto-expands organisation for nested routes and shows breadcrumbs", () => {
    renderShell("/functional-units");

    const primaryNav = screen.getByRole("navigation", { name: /primary/i });
    expect(
      within(primaryNav).getByRole("link", { name: /functional units/i })
    ).toBeInTheDocument();
    expect(
      within(primaryNav).getByRole("link", { name: /^users$/i })
    ).toBeInTheDocument();
    expect(screen.getByText("Functional units content")).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: /breadcrumb/i })
    ).toHaveTextContent(/Organisation.*Functional Units/i);
  });

  it("shows Users under Organisation", () => {
    renderShell("/users");
    const primaryNav = screen.getByRole("navigation", { name: /primary/i });
    expect(
      within(primaryNav).getByRole("link", { name: /^users$/i })
    ).toBeInTheDocument();
    expect(screen.getByText("Users content")).toBeInTheDocument();
  });

  it("shows Risks as a top-level nav item", () => {
    renderShell("/risks");
    const primaryNav = screen.getByRole("navigation", { name: /primary/i });
    expect(
      within(primaryNav).getByRole("link", { name: /^risks$/i })
    ).toBeInTheDocument();
    expect(screen.getByText("Risks content")).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: /breadcrumb/i })
    ).toHaveTextContent(/^DashboardRisks$|Dashboard.*Risks/i);
  });

  it("exposes the theme selector in the navbar", () => {
    renderShell("/");
    expect(
      screen.getByRole("button", { name: /choose color theme/i })
    ).toBeInTheDocument();
  });
});
