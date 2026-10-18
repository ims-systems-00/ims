import { afterEach, describe, expect, it, vi } from "vitest";
import { Auth0AuthClient } from "@/security/auth0-auth-client";
import {
  clearActiveOrganisation,
  getActiveAuth0OrganizationId,
  getActiveOrganisationId,
  setActiveOrganisationContext,
} from "@/shared/lib/active-organisation";

const IMS_ORG_A = "aaaaaaaaaaaaaaaaaaaaaaaa";
const IMS_ORG_B = "bbbbbbbbbbbbbbbbbbbbbbbb";

describe("Auth0AuthClient", () => {
  afterEach(() => {
    clearActiveOrganisation();
  });

  it("returns identity when Auth0 session is authenticated", async () => {
    setActiveOrganisationContext({
      organizationId: IMS_ORG_B,
      auth0OrganizationId: "org_b",
    });
    const client = new Auth0AuthClient({
      audience: "https://api.example.local",
      sdk: {
        isAuthenticated: true,
        user: { sub: "auth0|ada", email: "ada@example.com" },
        getAccessTokenSilently: vi.fn(),
        loginWithRedirect: vi.fn(),
        logout: vi.fn(),
      },
    });

    await expect(client.isAuthenticated()).resolves.toBe(true);
    await expect(client.getIdentity()).resolves.toEqual({
      subjectId: "auth0|ada",
      email: "ada@example.com",
      organizationId: IMS_ORG_B,
    });
  });

  it("returns null identity when not authenticated", async () => {
    const client = new Auth0AuthClient({
      audience: "https://api.example.local",
      sdk: {
        isAuthenticated: false,
        user: null,
        getAccessTokenSilently: vi.fn(),
        loginWithRedirect: vi.fn(),
        logout: vi.fn(),
      },
    });
    await expect(client.getIdentity()).resolves.toBeNull();
    await expect(client.getAccessToken()).resolves.toBeNull();
  });

  it("requests an access token with audience and active Auth0 organisation", async () => {
    setActiveOrganisationContext({
      organizationId: IMS_ORG_A,
      auth0OrganizationId: "org_active",
    });
    const getAccessTokenSilently = vi.fn().mockResolvedValue("tok_abc");
    const client = new Auth0AuthClient({
      audience: "https://api.example.local",
      sdk: {
        isAuthenticated: true,
        user: { sub: "auth0|ada" },
        getAccessTokenSilently,
        loginWithRedirect: vi.fn(),
        logout: vi.fn(),
      },
    });

    await expect(client.getAccessToken()).resolves.toBe("tok_abc");
    expect(getAccessTokenSilently).toHaveBeenCalledWith({
      authorizationParams: {
        audience: "https://api.example.local",
        organization: "org_active",
      },
    });
  });

  it("switchOrganisation persists IMS + Auth0 ids only after token success", async () => {
    const getAccessTokenSilently = vi.fn().mockResolvedValue("tok_new");
    const client = new Auth0AuthClient({
      audience: "https://api.example.local",
      sdk: {
        isAuthenticated: true,
        user: { sub: "auth0|ada" },
        getAccessTokenSilently,
        loginWithRedirect: vi.fn(),
        logout: vi.fn(),
      },
    });

    await client.switchOrganisation({
      organizationId: IMS_ORG_B,
      auth0OrganizationId: "org_b",
    });

    expect(getAccessTokenSilently).toHaveBeenCalledWith({
      authorizationParams: {
        audience: "https://api.example.local",
        organization: "org_b",
      },
      cacheMode: "off",
    });
    expect(getActiveOrganisationId()).toBe(IMS_ORG_B);
    expect(getActiveAuth0OrganizationId()).toBe("org_b");
  });

  it("switchOrganisation does not persist when token acquisition fails", async () => {
    setActiveOrganisationContext({
      organizationId: IMS_ORG_A,
      auth0OrganizationId: "org_a",
    });
    const client = new Auth0AuthClient({
      audience: "https://api.example.local",
      sdk: {
        isAuthenticated: true,
        user: { sub: "auth0|ada" },
        getAccessTokenSilently: vi.fn().mockRejectedValue(new Error("denied")),
        loginWithRedirect: vi.fn(),
        logout: vi.fn(),
      },
    });

    await expect(
      client.switchOrganisation({
        organizationId: IMS_ORG_B,
        auth0OrganizationId: "org_b",
      })
    ).rejects.toThrow(/failed to acquire Auth0 access token/);

    expect(getActiveOrganisationId()).toBe(IMS_ORG_A);
    expect(getActiveAuth0OrganizationId()).toBe("org_a");
  });

  it("switchOrganisation requires an Auth0 Organization id", async () => {
    const client = new Auth0AuthClient({
      audience: "https://api.example.local",
      sdk: {
        isAuthenticated: true,
        user: { sub: "auth0|ada" },
        getAccessTokenSilently: vi.fn(),
        loginWithRedirect: vi.fn(),
        logout: vi.fn(),
      },
    });

    await expect(
      client.switchOrganisation({
        organizationId: IMS_ORG_B,
        auth0OrganizationId: null,
      })
    ).rejects.toThrow(/Auth0 Organization id is not linked/);
  });

  it("login requests signup screen without forcing default organisation", async () => {
    const loginWithRedirect = vi.fn().mockResolvedValue(undefined);
    const client = new Auth0AuthClient({
      audience: "https://api.example.local",
      defaultOrganizationId: "org_default",
      sdk: {
        isAuthenticated: false,
        user: null,
        getAccessTokenSilently: vi.fn(),
        loginWithRedirect,
        logout: vi.fn(),
      },
    });

    await client.login({ mode: "signup", returnTo: "/onboard/organisation" });

    expect(loginWithRedirect).toHaveBeenCalledWith({
      appState: { returnTo: "/onboard/organisation" },
      authorizationParams: {
        audience: "https://api.example.local",
        screen_hint: "signup",
      },
    });
  });

  it("logout clears active organisation state", async () => {
    setActiveOrganisationContext({
      organizationId: IMS_ORG_A,
      auth0OrganizationId: "org_a",
    });
    const logout = vi.fn().mockResolvedValue(undefined);
    const client = new Auth0AuthClient({
      audience: "https://api.example.local",
      sdk: {
        isAuthenticated: true,
        user: { sub: "auth0|ada" },
        getAccessTokenSilently: vi.fn(),
        loginWithRedirect: vi.fn(),
        logout,
      },
    });

    await client.logout({ returnTo: "http://localhost:3000" });
    expect(getActiveOrganisationId()).toBeNull();
    expect(getActiveAuth0OrganizationId()).toBeNull();
    expect(logout).toHaveBeenCalledWith({
      logoutParams: { returnTo: "http://localhost:3000" },
    });
  });
});
