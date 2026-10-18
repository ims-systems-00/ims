import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@/shared/theme";
import { RegisterPage } from "@/modules/auth";

const register = vi.fn().mockResolvedValue(undefined);

vi.mock("@/security", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/security")>();
  return {
    ...actual,
    useAuthClient: () => ({
      isAuthenticated: vi.fn().mockResolvedValue(false),
      login: vi.fn(),
      loginWithPassword: vi.fn(),
      register,
      requestPasswordReset: vi.fn(),
      logout: vi.fn(),
      getAccessToken: vi.fn(),
      getIdentity: vi.fn(),
      switchOrganisation: vi.fn(),
    }),
  };
});

vi.mock("@/shared/lib/env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared/lib/env")>();
  return {
    ...actual,
    loadPublicEnv: () => ({
      VITE_API_BASE_URL: "http://127.0.0.1:3001/api/v1",
      VITE_SECURITY_PROVIDER: "auth0-openfga",
      VITE_AUTH0_DOMAIN: "example.auth0.com",
      VITE_AUTH0_CLIENT_ID: "client",
      VITE_AUTH0_AUDIENCE: "https://api.example.local",
      VITE_AUTH0_ORGANIZATION_ID: "",
    }),
  };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("RegisterPage", () => {
  it("submits register then navigates home (membership gate → onboard)", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={["/register"]}>
          <Routes>
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/" element={<p>Post-auth home</p>} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    );

    expect(
      await screen.findByRole("heading", { name: /create account/i })
    ).toBeInTheDocument();

    await user.type(
      screen.getByRole("textbox", { name: /first name/i }),
      "Ada"
    );
    await user.type(
      screen.getByRole("textbox", { name: /last name/i }),
      "Lovelace"
    );
    await user.type(
      screen.getByRole("textbox", { name: /email/i }),
      "ada@example.com"
    );
    await user.type(document.getElementById("register-password")!, "Str0ng-Pass!");
    await user.type(
      document.getElementById("register-confirm-password")!,
      "Str0ng-Pass!"
    );
    await user.click(screen.getByRole("button", { name: /sign up/i }));

    expect(register).toHaveBeenCalledWith({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      password: "Str0ng-Pass!",
    });
    expect(await screen.findByText("Post-auth home")).toBeInTheDocument();
  });
});
