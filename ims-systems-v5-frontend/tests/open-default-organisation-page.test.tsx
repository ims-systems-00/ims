import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@/shared/theme";
import { OpenDefaultOrganisationPage } from "@/modules/auth";
import type { Organisation } from "@/modules/organisation/types";

const switchOrganisation = vi.fn().mockResolvedValue(undefined);
const listMyOrganisations = vi.fn();
const ensureOrganisationAuth0Link = vi.fn();

vi.mock("@/security", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/security")>();
  return {
    ...actual,
    useAuthClient: () => ({
      isAuthenticated: vi.fn().mockResolvedValue(true),
      login: vi.fn(),
      loginWithPassword: vi.fn(),
      register: vi.fn(),
      requestPasswordReset: vi.fn(),
      logout: vi.fn().mockResolvedValue(undefined),
      getAccessToken: vi.fn(),
      getIdentity: vi.fn(),
      switchOrganisation,
    }),
  };
});

vi.mock("@/modules/organisation/api/organisations", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/modules/organisation/api/organisations")
    >();
  return {
    ...actual,
    listMyOrganisations: () => listMyOrganisations(),
    ensureOrganisationAuth0Link: (id: string) =>
      ensureOrganisationAuth0Link(id),
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

function org(id: string, name: string, extra: Partial<Organisation> = {}) {
  return {
    id,
    name,
    reference: `REF-${name}`,
    isCustomer: true,
    isPartner: false,
    status: "Running",
    logoSrc: null,
    logoStorage: null,
    auth0OrganizationId: `org_${id}`,
    ...extra,
  } as Organisation;
}

const ACME = "aaaaaaaaaaaaaaaaaaaaaaaa";
const GLOBEX = "bbbbbbbbbbbbbbbbbbbbbbbb";

function renderPage(returnTo?: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <MemoryRouter
          initialEntries={[
            { pathname: "/opening-workspace", state: { returnTo } },
          ]}
        >
          <Routes>
            <Route
              path="/opening-workspace"
              element={<OpenDefaultOrganisationPage />}
            />
            <Route path="/" element={<p>Dashboard</p>} />
            <Route path="/risks" element={<p>Risks</p>} />
            <Route path="/onboard/organisation" element={<p>Onboard</p>} />
            <Route path="/login" element={<p>Login</p>} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

afterEach(() => {
  cleanup();
  document.getElementById("imsi")?.remove();
  document.documentElement.classList.remove("ims-intro");
  document.body.style.transform = "";
  document.body.style.transformOrigin = "";
  document.body.style.filter = "";
  window.localStorage.clear();
  vi.clearAllMocks();
});

describe("OpenDefaultOrganisationPage", () => {
  it("opens the starred default organisation without asking", async () => {
    listMyOrganisations.mockResolvedValue([
      org(ACME, "Acme", { isDefault: false }),
      org(GLOBEX, "Globex", { isDefault: true }),
    ]);
    renderPage();

    expect(await screen.findByText("Dashboard")).toBeInTheDocument();
    expect(switchOrganisation).toHaveBeenCalledTimes(1);
    expect(switchOrganisation).toHaveBeenCalledWith({
      organizationId: GLOBEX,
      auth0OrganizationId: `org_${GLOBEX}`,
    });
    expect(screen.queryByText("Acme")).not.toBeInTheDocument();
  });

  it("falls back to the first-joined organisation when none is flagged", async () => {
    listMyOrganisations.mockResolvedValue([
      org(ACME, "Acme"),
      org(GLOBEX, "Globex"),
    ]);
    renderPage();

    expect(await screen.findByText("Dashboard")).toBeInTheDocument();
    expect(switchOrganisation).toHaveBeenCalledWith({
      organizationId: ACME,
      auth0OrganizationId: `org_${ACME}`,
    });
  });

  it("returns to the original deep link", async () => {
    listMyOrganisations.mockResolvedValue([org(ACME, "Acme")]);
    renderPage("/risks");

    expect(await screen.findByText("Risks")).toBeInTheDocument();
  });

  it("links Auth0 first when the default is not linked yet", async () => {
    const unlinked = org(ACME, "Acme", {
      auth0OrganizationId: null,
      isDefault: true,
    });
    listMyOrganisations.mockResolvedValue([unlinked, org(GLOBEX, "Globex")]);
    ensureOrganisationAuth0Link.mockResolvedValue({
      ...unlinked,
      auth0OrganizationId: "org_linked",
    });
    renderPage();

    expect(await screen.findByText("Dashboard")).toBeInTheDocument();
    expect(ensureOrganisationAuth0Link).toHaveBeenCalledWith(ACME);
    expect(switchOrganisation).toHaveBeenCalledWith({
      organizationId: ACME,
      auth0OrganizationId: "org_linked",
    });
  });

  it("tries the next organisation when the default cannot be opened", async () => {
    listMyOrganisations.mockResolvedValue([
      org(ACME, "Acme", { isDefault: true }),
      org(GLOBEX, "Globex"),
    ]);
    switchOrganisation.mockRejectedValueOnce(new Error("Token refused"));
    renderPage();

    expect(await screen.findByText("Dashboard")).toBeInTheDocument();
    expect(switchOrganisation).toHaveBeenLastCalledWith({
      organizationId: GLOBEX,
      auth0OrganizationId: `org_${GLOBEX}`,
    });
  });

  it("shows an error when no organisation can be opened", async () => {
    listMyOrganisations.mockResolvedValue([org(ACME, "Acme")]);
    switchOrganisation.mockRejectedValueOnce(new Error("Token refused"));
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Token refused"
    );
    expect(screen.getByRole("button", { name: /retry/i })).toBeEnabled();
  });

  it("sends users with no organisations to onboarding", async () => {
    listMyOrganisations.mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText("Onboard")).toBeInTheDocument();
  });
});
