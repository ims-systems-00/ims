/**
 * AuthClient backed by V5 `/auth/*` BFF (Auth0 Database password grant).
 * Source of truth for auth0-openfga email/password sessions.
 */

import type {
  AuthClient,
  ClientIdentity,
  GetAccessTokenOptions,
  LoginOptions,
  PasswordCredentials,
  RegisterCredentials,
  SwitchOrganisationInput,
} from "./auth-client";
import {
  clearActiveOrganisation,
  getActiveOrganisationId,
  setActiveOrganisationContext,
} from "@/shared/lib/active-organisation";
import { loadPublicEnv } from "@/shared/lib/env";
import { ApiClientError, mapStatusToCode } from "@/shared/lib/http/errors";
import {
  clearStoredSession,
  getRefreshToken,
  getStoredSession,
  hasRefreshTokenPersisted,
  isAccessTokenExpired,
  setStoredSession,
} from "./token-store";

type TokenPayload = {
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number;
  tokenType: string;
};

type ApiSuccess<T> = { success: true; data: T };
type ApiFailure = {
  success: false;
  error: { code: string; message: string; details?: unknown };
};

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function postAuthPublic<T>(
  path: string,
  body: unknown
): Promise<T> {
  const env = loadPublicEnv();
  const url = `${env.VITE_API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = (await response.json().catch(() => null)) as
    | ApiSuccess<T>
    | ApiFailure
    | null;

  if (!response.ok || !json || json.success !== true) {
    const message =
      json && "error" in json
        ? json.error.message
        : `Request failed (${response.status})`;
    const code =
      json && "error" in json
        ? json.error.code
        : mapStatusToCode(response.status);
    throw new ApiClientError({
      message,
      status: response.status,
      code,
      details: json && "error" in json ? json.error.details : undefined,
    });
  }

  return json.data;
}

export class BffAuthClient implements AuthClient {
  private refreshInFlight: Promise<string | null> | null = null;

  async isAuthenticated(): Promise<boolean> {
    const session = getStoredSession();
    if (session?.accessToken && !isAccessTokenExpired()) return true;
    if (hasRefreshTokenPersisted()) {
      const token = await this.getAccessToken();
      return Boolean(token);
    }
    return false;
  }

  async getIdentity(): Promise<ClientIdentity | null> {
    const token = await this.getAccessToken();
    if (!token) return null;
    const payload = decodeJwtPayload(token);
    if (!payload) return null;
    const sub = typeof payload.sub === "string" ? payload.sub : null;
    if (!sub) return null;
    const email =
      typeof payload.email === "string"
        ? payload.email
        : typeof payload["https://ims.systems/email"] === "string"
          ? (payload["https://ims.systems/email"] as string)
          : undefined;
    return {
      subjectId: sub,
      email,
      organizationId: getActiveOrganisationId() ?? undefined,
    };
  }

  async getAccessToken(
    _options?: GetAccessTokenOptions
  ): Promise<string | null> {
    void _options;
    const session = getStoredSession();
    if (session?.accessToken && !isAccessTokenExpired()) {
      return session.accessToken;
    }

    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearStoredSession();
      return null;
    }

    if (!this.refreshInFlight) {
      this.refreshInFlight = this.refreshSession(refreshToken).finally(() => {
        this.refreshInFlight = null;
      });
    }
    return this.refreshInFlight;
  }

  private async refreshSession(refreshToken: string): Promise<string | null> {
    try {
      const tokens = await postAuthPublic<TokenPayload>("/auth/refresh", {
        refreshToken,
      });
      setStoredSession({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken ?? refreshToken,
        expiresIn: tokens.expiresIn,
      });
      return tokens.accessToken;
    } catch {
      clearStoredSession();
      return null;
    }
  }

  async switchOrganisation(input: SwitchOrganisationInput): Promise<void> {
    // User-only BFF tokens do not re-bind Auth0 orgs; persist IMS context only.
    setActiveOrganisationContext({
      organizationId: input.organizationId,
      auth0OrganizationId: input.auth0OrganizationId,
    });
  }

  async login(_options?: LoginOptions): Promise<void> {
    void _options;
    throw new Error(
      "Redirect login is not used for email/password. Use loginWithPassword."
    );
  }

  async loginWithPassword(credentials: PasswordCredentials): Promise<void> {
    // Drop any previous tenant context so a new session is not blocked by a
    // stale x-org-id from another account.
    clearActiveOrganisation();
    const tokens = await postAuthPublic<TokenPayload>("/auth/login", {
      email: credentials.email,
      password: credentials.password,
    });
    setStoredSession({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    });
  }

  async register(credentials: RegisterCredentials): Promise<void> {
    clearActiveOrganisation();
    const tokens = await postAuthPublic<TokenPayload>("/auth/register", {
      firstName: credentials.firstName,
      lastName: credentials.lastName,
      email: credentials.email,
      password: credentials.password,
      phone: credentials.phone,
    });
    setStoredSession({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    });
  }

  async requestPasswordReset(input: { email: string }): Promise<void> {
    await postAuthPublic<{ message: string }>("/auth/forgot-password", {
      email: input.email,
    });
  }

  async logout(_options?: { returnTo?: string }): Promise<void> {
    void _options;
    clearStoredSession();
    clearActiveOrganisation();
  }
}
