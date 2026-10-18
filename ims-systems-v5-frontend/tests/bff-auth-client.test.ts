import { afterEach, describe, expect, it, vi } from "vitest";
import { BffAuthClient } from "@/security/bff-auth-client";
import {
  clearStoredSession,
  getStoredSession,
  setStoredSession,
} from "@/security/token-store";

function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: "none", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.sig`;
}

vi.mock("@/shared/lib/env", () => ({
  loadPublicEnv: () => ({
    VITE_API_BASE_URL: "http://127.0.0.1:3001/api/v1",
    VITE_SECURITY_PROVIDER: "auth0-openfga",
    VITE_AUTH0_DOMAIN: "example.auth0.com",
    VITE_AUTH0_CLIENT_ID: "client",
    VITE_AUTH0_AUDIENCE: "https://api.example.local",
    VITE_AUTH0_ORGANIZATION_ID: "",
  }),
}));

afterEach(() => {
  clearStoredSession();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("BffAuthClient", () => {
  it("loginWithPassword stores tokens and reports authenticated", async () => {
    const accessToken = makeJwt({
      sub: "auth0|ada",
      email: "ada@example.com",
    });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            accessToken,
            refreshToken: "refresh-1",
            expiresIn: 3600,
            tokenType: "Bearer",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = new BffAuthClient();
    await client.loginWithPassword({
      email: "ada@example.com",
      password: "Str0ng-Pass!",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:3001/api/v1/auth/login",
      expect.objectContaining({ method: "POST" })
    );
    expect(getStoredSession()?.accessToken).toBe(accessToken);
    await expect(client.isAuthenticated()).resolves.toBe(true);
    await expect(client.getIdentity()).resolves.toMatchObject({
      subjectId: "auth0|ada",
      email: "ada@example.com",
    });
    await expect(client.getAccessToken()).resolves.toBe(accessToken);
  });

  it("register stores tokens (new user → membership gate / onboard)", async () => {
    const accessToken = makeJwt({ sub: "auth0|new", email: "new@example.com" });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              accessToken,
              refreshToken: "refresh-new",
              expiresIn: 3600,
              tokenType: "Bearer",
            },
          }),
          { status: 201, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    const client = new BffAuthClient();
    await client.register({
      firstName: "New",
      lastName: "User",
      email: "new@example.com",
      password: "Str0ng-Pass!",
    });

    await expect(client.isAuthenticated()).resolves.toBe(true);
    await expect(client.getAccessToken()).resolves.toBe(accessToken);
  });

  it("logout clears the session", async () => {
    const accessToken = makeJwt({ sub: "auth0|ada" });
    setStoredSession({
      accessToken,
      refreshToken: "r",
      expiresIn: 3600,
    });
    const client = new BffAuthClient();
    await client.logout();
    expect(getStoredSession()).toBeNull();
    await expect(client.isAuthenticated()).resolves.toBe(false);
  });
});
