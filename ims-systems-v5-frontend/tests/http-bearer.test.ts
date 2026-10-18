import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/shared/lib/http/client";
import { setActiveAuthClient } from "@/security/runtime";
import type { AuthClient } from "@/security/auth-client";

describe("apiRequest Bearer attachment", () => {
  afterEach(() => {
    setActiveAuthClient(null);
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("attaches Authorization Bearer from the active auth client", async () => {
    const authClient: AuthClient = {
      getIdentity: vi.fn(),
      isAuthenticated: vi.fn().mockResolvedValue(true),
      getAccessToken: vi.fn().mockResolvedValue("access-token-1"),
      switchOrganisation: vi.fn(),
      login: vi.fn(),
      loginWithPassword: vi.fn(),
      register: vi.fn(),
      requestPasswordReset: vi.fn(),
      logout: vi.fn(),
    };
    setActiveAuthClient(authClient);

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { ok: true } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const data = await apiRequest<{ ok: boolean }>("/health");
    expect(data).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalled();
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer access-token-1");
  });

  it("skips Authorization when auth client has no token (stub)", async () => {
    const authClient: AuthClient = {
      getIdentity: vi.fn(),
      isAuthenticated: vi.fn().mockResolvedValue(true),
      getAccessToken: vi.fn().mockResolvedValue(null),
      switchOrganisation: vi.fn(),
      login: vi.fn(),
      loginWithPassword: vi.fn(),
      register: vi.fn(),
      requestPasswordReset: vi.fn(),
      logout: vi.fn(),
    };
    setActiveAuthClient(authClient);

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { ok: true } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await apiRequest("/health");
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });
});
