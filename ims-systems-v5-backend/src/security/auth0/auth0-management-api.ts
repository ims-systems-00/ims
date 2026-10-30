/**
 * Auth0 Management API client (N-13 sessions, N-09 Organizations).
 *
 * Requires a Machine-to-Machine application authorized for the
 * Management API (AUTH0_MGMT_CLIENT_ID / AUTH0_MGMT_CLIENT_SECRET).
 * Tokens are fetched with client_credentials and cached until expiry.
 * Backend-only — the M2M secret must never reach the frontend.
 */

import type { AppConfig } from "../../config";

export type Auth0ManagementApiConfig = {
  domain: string;
  clientId: string;
  clientSecret: string;
  fetchFn?: typeof fetch;
};

type FetchFn = typeof fetch;

const normalizeDomain = (domain: string) =>
  domain.replace(/^https?:\/\//, "").replace(/\/$/, "");

export const isAuth0ManagementConfigured = (
  config: Pick<AppConfig, "AUTH0_DOMAIN" | "AUTH0_MGMT_CLIENT_ID" | "AUTH0_MGMT_CLIENT_SECRET">,
): boolean =>
  Boolean(
    config.AUTH0_DOMAIN.trim() &&
      config.AUTH0_MGMT_CLIENT_ID.trim() &&
      config.AUTH0_MGMT_CLIENT_SECRET.trim(),
  );

export class Auth0ManagementApi {
  private readonly domain: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly fetchFn: FetchFn;
  private cached: { token: string; expiresAt: number } | null = null;

  constructor(config: Auth0ManagementApiConfig) {
    this.domain = normalizeDomain(config.domain);
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.fetchFn = config.fetchFn ?? fetch;
  }

  private async getToken(): Promise<string> {
    if (this.cached && this.cached.expiresAt > Date.now() + 30_000) {
      return this.cached.token;
    }
    // Auth0 expects application/x-www-form-urlencoded for /oauth/token.
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: this.clientId,
      client_secret: this.clientSecret,
      audience: `https://${this.domain}/api/v2/`,
    });
    const res = await this.fetchFn(`https://${this.domain}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `Auth0 Management token request failed (HTTP ${res.status})${text ? `: ${text.slice(0, 300)}` : ""}. ` +
          "Confirm AUTH0_MGMT_* is an M2M app authorized for Auth0 Management API (Applications → APIs → Auth0 Management API → Machine to Machine).",
      );
    }
    const tokenBody = (await res.json()) as {
      access_token: string;
      expires_in?: number;
    };
    this.cached = {
      token: tokenBody.access_token,
      expiresAt: Date.now() + (tokenBody.expires_in ?? 3600) * 1000,
    };
    return this.cached.token;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = await this.getToken();
    const res = await this.fetchFn(`https://${this.domain}/api/v2${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `Auth0 Management ${init.method ?? "GET"} ${path} failed (HTTP ${res.status})${text ? `: ${text.slice(0, 200)}` : ""}`,
      );
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  /** Create an Auth0 Organization; returns its id (org_...). */
  async createOrganization(input: {
    name: string;
    displayName?: string;
  }): Promise<{ id: string }> {
    const org = await this.request<{ id: string }>("/organizations", {
      method: "POST",
      body: JSON.stringify({
        name: input.name,
        display_name: input.displayName ?? input.name,
      }),
    });
    return { id: org.id };
  }

  async getOrganizationByName(name: string): Promise<{ id: string } | null> {
    try {
      return await this.request<{ id: string }>(
        `/organizations/name/${encodeURIComponent(name)}`,
      );
    } catch {
      return null;
    }
  }

  /** Look up a connection id by name (e.g. Username-Password-Authentication). */
  async getConnectionIdByName(name: string): Promise<string | null> {
    const rows = await this.request<Array<{ id: string; name: string }>>(
      `/connections?strategy=auth0&name=${encodeURIComponent(name)}`,
    ).catch(() => [] as Array<{ id: string; name: string }>);
    const match = rows.find((row) => row.name === name) ?? rows[0];
    return match?.id ?? null;
  }

  /** Enable a database/social connection on an Auth0 Organization. */
  async enableOrganizationConnection(input: {
    organizationId: string;
    connectionId: string;
    assignMembershipOnLogin?: boolean;
  }): Promise<void> {
    await this.request(
      `/organizations/${encodeURIComponent(input.organizationId)}/enabled_connections`,
      {
        method: "POST",
        body: JSON.stringify({
          connection_id: input.connectionId,
          assign_membership_on_login: input.assignMembershipOnLogin ?? true,
        }),
      },
    ).catch(async (error) => {
      // Already enabled — treat as success.
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("HTTP 409") || message.includes("HTTP 400")) return;
      throw error;
    });
  }

  /** Add Auth0 users as members of an Auth0 Organization. */
  async addOrganizationMembers(
    organizationId: string,
    auth0UserIds: string[],
  ): Promise<void> {
    const members = auth0UserIds.map((id) => id.trim()).filter(Boolean);
    if (members.length === 0) return;
    await this.request(
      `/organizations/${encodeURIComponent(organizationId)}/members`,
      {
        method: "POST",
        body: JSON.stringify({ members }),
      },
    ).catch(async (error) => {
      const message = error instanceof Error ? error.message : String(error);
      // Already a member is fine for idempotent ensure.
      if (message.includes("HTTP 409") || message.includes("HTTP 400")) return;
      throw error;
    });
  }

  /**
   * Revoke a user's refresh tokens / grants so existing sessions cannot
   * be extended. Auth0 access tokens are stateless and remain valid
   * until expiry — keep API token lifetime short.
   */
  async revokeUserGrants(auth0UserId: string): Promise<void> {
    await this.request(
      `/grants?user_id=${encodeURIComponent(auth0UserId)}`,
      { method: "DELETE" },
    ).catch(() => undefined);
    // Also delete any server-side sessions for the user when available.
    await this.request(`/users/${encodeURIComponent(auth0UserId)}/sessions`, {
      method: "DELETE",
    }).catch(() => undefined);
  }
}

export const createAuth0ManagementApiFromConfig = (
  config: AppConfig,
  fetchFn?: typeof fetch,
): Auth0ManagementApi | null => {
  if (!isAuth0ManagementConfigured(config)) return null;
  return new Auth0ManagementApi({
    domain: config.AUTH0_DOMAIN,
    clientId: config.AUTH0_MGMT_CLIENT_ID,
    clientSecret: config.AUTH0_MGMT_CLIENT_SECRET,
    fetchFn,
  });
};
