import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@/shared/theme";
import { LoginPage } from "@/modules/auth";

const loginWithPassword = vi.fn().mockResolvedValue(undefined);

vi.mock("@/security", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/security")>();
  return {
    ...actual,
    useAuthClient: () => ({
      isAuthenticated: vi.fn().mockResolvedValue(false),
      login: vi.fn(),
      loginWithPassword,
      register: vi.fn(),
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

describe("LoginPage", () => {
  it("submits email/password via BFF loginWithPassword", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={["/login"]}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<p>Home</p>} />
            <Route path="/register" element={<p>Register</p>} />
            <Route path="/forgot-password" element={<p>Forgot</p>} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    );

    expect(
      await screen.findByRole("heading", { name: /welcome back/i })
    ).toBeInTheDocument();

    await user.type(screen.getByRole("textbox", { name: /email/i }), "ada@example.com");
    await user.type(document.getElementById("login-password")!, "Str0ng-Pass!");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    expect(loginWithPassword).toHaveBeenCalledWith({
      email: "ada@example.com",
      password: "Str0ng-Pass!",
    });
    expect(await screen.findByText("Home")).toBeInTheDocument();
  });
});
