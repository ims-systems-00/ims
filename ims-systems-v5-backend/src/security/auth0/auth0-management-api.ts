/**
 * Auth0 Management API client (N-13 sessions, N-09 Organizations,
 * identity backfill: users + change-password emails).
 *
 * Requires a Machine-to-Machine application authorized for the
 * Management API (AUTH0_MGMT_CLIENT_ID / AUTH0_MGMT_CLIENT_SECRET).
 * Tokens are fetched with client_credentials and cached until expiry.
 * Backend-only — the M2M secret must never reach the frontend.
 */

import { randomBytes } from "node:crypto";
import type { AppConfig } from "../../config";

export type Auth0ManagementApiConfig = {
  domain: string;
  clientId: string;
  clientSecret: string;
  /** SPA / ROPG client id used for dbconnections/change_password emails. */
  spaClientId?: string;
  fetchFn?: typeof fetch;
};

export type Auth0ManagedUser = {
  user_id: string;
  email?: string;
  email_verified?: boolean;
};

type FetchFn = typeof fetch;

const MAX_RATE_LIMIT_RETRIES = 8;

/**
 * Milliseconds to wait before retrying a 429. Uses Auth0's
 * `x-ratelimit-reset` (epoch seconds) or `Retry-After` when present,
 * otherwise exponential backoff; capped at 60s.
 */
const rateLimitDelayMs = (res: Response, attempt: number): number => {
  const reset = Number(res.headers.get("x-ratelimit-reset"));
  if (Number.isFinite(reset) && reset > 0) {
    const ms = reset * 1000 - Date.now();
    if (ms > 0) return Math.min(ms + 250, 60_000);
  }
  const retryAfter = Number(res.headers.get("retry-after"));
  if (Number.isFinite(retryAfter) && retryAfter > 0) {
    return Math.min(retryAfter * 1000, 60_000);
  }
  return Math.min(1000 * 2 ** attempt, 60_000);
};

/** fetch that waits and retries when Auth0 answers 429 Too Many Requests. */
const fetchWithRateLimitRetry = async (
  fetchFn: FetchFn,
  url: string,
  init: RequestInit,
): Promise<Response> => {
  for (let attempt = 0; ; attempt += 1) {
    const res = await fetchFn(url, init);
    if (res.status !== 429 || attempt >= MAX_RATE_LIMIT_RETRIES) return res;
    await res.text().catch(() => "");
    await new Promise((resolve) => setTimeout(resolve, rateLimitDelayMs(res, attempt)));
  }
};

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
  private readonly spaClientId: string;
  private readonly fetchFn: FetchFn;
  private cached: { token: string; expiresAt: number } | null = null;

  constructor(config: Auth0ManagementApiConfig) {
    this.domain = normalizeDomain(config.domain);
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.spaClientId = config.spaClientId?.trim() || config.clientId;
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
    const res = await fetchWithRateLimitRetry(this.fetchFn, `https://${this.domain}/oauth/token`, {
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
    const res = await fetchWithRateLimitRetry(this.fetchFn, `https://${this.domain}/api/v2${path}`, {
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
    } catch (error) {
      // Only "not found" means absent; rate limits / outages must not be
      // mistaken for it, or callers would try to create a duplicate org.
      if (error instanceof Error && error.message.includes("HTTP 404")) return null;
      throw error;
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

  /** Look up a user by email (Auth0 users-by-email). */
  async getUserByEmail(email: string): Promise<Auth0ManagedUser | null> {
    const normalized = email.trim().toLowerCase();
    if (!normalized) return null;
    // Errors propagate: treating a failed lookup as "no user" would make
    // ensureUserByEmail create a duplicate.
    const rows = await this.request<Auth0ManagedUser[]>(
      `/users-by-email?email=${encodeURIComponent(normalized)}`,
    );
    return rows[0] ?? null;
  }

  /**
   * Create a DB-connection user. Password is a random unusable secret —
   * callers must trigger change_password so the person can set their own.
   */
  async createUser(input: {
    email: string;
    connection: string;
    emailVerified?: boolean;
    name?: string;
  }): Promise<Auth0ManagedUser> {
    const email = input.email.trim().toLowerCase();
    const password = `Im${randomBytes(24).toString("base64url")}!9a`;
    return this.request<Auth0ManagedUser>("/users", {
      method: "POST",
      body: JSON.stringify({
        email,
        connection: input.connection,
        password,
        email_verified: input.emailVerified ?? true,
        verify_email: false,
        ...(input.name?.trim() ? { name: input.name.trim() } : {}),
      }),
    });
  }

  /** Get existing Auth0 user by email, or create on the DB connection. */
  async ensureUserByEmail(input: {
    email: string;
    connection: string;
    emailVerified?: boolean;
    name?: string;
  }): Promise<{ user: Auth0ManagedUser; created: boolean }> {
    const existing = await this.getUserByEmail(input.email);
    if (existing?.user_id) {
      return { user: existing, created: false };
    }
    const created = await this.createUser(input);
    return { user: created, created: true };
  }

  /**
   * Trigger Auth0's change-password email (same endpoint as forgot-password).
   * Uses the SPA client id when configured so the email branding/client matches login.
   */
  async sendChangePasswordEmail(input: {
    email: string;
    connection: string;
  }): Promise<void> {
    const email = input.email.trim().toLowerCase();
    const url = `https://${this.domain}/dbconnections/change_password`;
    const res = await fetchWithRateLimitRetry(this.fetchFn, url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: this.spaClientId,
        email,
        connection: input.connection,
      }),
    });
    if (res.ok) return;
    const text = await res.text().catch(() => "");
    throw new Error(
      `Auth0 change_password failed (HTTP ${res.status})${text ? `: ${text.slice(0, 200)}` : ""}`,
    );
  }

  /**
   * Start an Auth0 bulk user import job (multipart upload of a JSON array).
   * Auth0 caps each file at 500KB. With `upsert: false`, users whose email
   * already exists on the connection are left untouched (reported as
   * duplicates in the job errors).
   */
  async startUsersImport(input: {
    connectionId: string;
    usersJson: string;
    upsert?: boolean;
    externalId?: string;
  }): Promise<{ id: string; status: string }> {
    const token = await this.getToken();
    const form = new FormData();
    form.append(
      "users",
      new Blob([input.usersJson], { type: "application/json" }),
      "users.json",
    );
    form.append("connection_id", input.connectionId);
    form.append("upsert", String(input.upsert ?? false));
    form.append("send_completion_email", "false");
    if (input.externalId) form.append("external_id", input.externalId);
    const res = await fetchWithRateLimitRetry(this.fetchFn, `https://${this.domain}/api/v2/jobs/users-imports`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `Auth0 users-imports failed (HTTP ${res.status})${text ? `: ${text.slice(0, 300)}` : ""}`,
      );
    }
    return (await res.json()) as { id: string; status: string };
  }

  async getJob(jobId: string): Promise<{
    id: string;
    status: string;
    summary?: { failed: number; updated: number; inserted: number; total: number };
  }> {
    return this.request(`/jobs/${encodeURIComponent(jobId)}`);
  }

  /** Per-user errors of a finished import job (empty when none). */
  async getJobErrors(
    jobId: string,
  ): Promise<Array<{ user?: { email?: string }; errors?: Array<{ code: string; message: string }> }>> {
    const rows = await this.request<unknown>(
      `/jobs/${encodeURIComponent(jobId)}/errors`,
    ).catch(() => []);
    return Array.isArray(rows) ? (rows as never) : [];
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
    spaClientId: config.AUTH0_SPA_CLIENT_ID || config.AUTH0_ROPG_CLIENT_ID,
    fetchFn,
  });
};
