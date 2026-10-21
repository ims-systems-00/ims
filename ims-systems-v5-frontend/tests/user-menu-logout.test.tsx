import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { UserMenu } from "@/shared/layout/user-menu";

const logout = vi.fn(async () => undefined);

vi.mock("@/shared/lib/env", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  const original = actual.loadPublicEnv as () => Record<string, unknown>;
  return {
    ...actual,
    loadPublicEnv: () => ({
      ...original(),
      VITE_SECURITY_PROVIDER: "auth0-openfga",
    }),
  };
});

vi.mock("@/security", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    useAuthClient: () => ({ logout }),
  };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("UserMenu logout", () => {
  it("logs out and navigates to the login page", async () => {
    const user = userEvent.setup();
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route path="/" element={<UserMenu />} />
            <Route path="/login" element={<p>Login page</p>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await user.click(
      await screen.findByRole("button", { name: /open account menu/i })
    );
    await user.click(
      await screen.findByRole("menuitem", { name: /^logout$/i })
    );

    expect(logout).toHaveBeenCalledOnce();
    expect(await screen.findByText("Login page")).toBeInTheDocument();
  });
});
