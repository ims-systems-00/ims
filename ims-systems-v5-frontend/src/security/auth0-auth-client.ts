/**
 * Auth0 SPA AuthClient adapter (auth rollout M4/M5).
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
  getActiveAuth0OrganizationId,
  getActiveOrganisationId,
  setActiveOrganisationContext,
} from "@/shared/lib/active-organisation";

export type Auth0SdkBridge = {
  isAuthenticated: boolean;
  user?: {
    sub?: string;
    email?: string;
  } | null;
  getAccessTokenSilently: (options?: {
    authorizationParams?: Record<string, string>;
    cacheMode?: "on" | "off" | "cache-only";
  }) => Promise<string>;
  loginWithRedirect: (options?: {
    appState?: { returnTo?: string };
    authorizationParams?: Record<string, string>;
  }) => Promise<void>;
  logout: (options?: { logoutParams?: { returnTo?: string } }) => Promise<void>;
};

export type Auth0AuthClientOptions = {
  sdk: Auth0SdkBridge;
  audience: string;
  /** Fallback Auth0 Organization when none is active yet (optional env). */
  defaultOrganizationId?: string;
};

export class Auth0AuthClient implements AuthClient {
  private readonly sdk: Auth0SdkBridge;
  private readonly audience: string;
  private readonly defaultOrganizationId?: string;

  constructor(options: Auth0AuthClientOptions) {
    this.sdk = options.sdk;
    this.audience = options.audience;
    this.defaultOrganizationId =
      options.defaultOrganizationId?.trim() || undefined;
  }

  async isAuthenticated(): Promise<boolean> {
    return this.sdk.isAuthenticated;
  }

  async getIdentity(): Promise<ClientIdentity | null> {
    if (!this.sdk.isAuthenticated || !this.sdk.user?.sub) {
      return null;
    }
    return {
      subjectId: this.sdk.user.sub,
      email: this.sdk.user.email,
      organizationId: getActiveOrganisationId() ?? undefined,
    };
  }

  async getAccessToken(
    options: GetAccessTokenOptions = {}
  ): Promise<string | null> {
    if (!this.sdk.isAuthenticated) return null;
    try {
      const auth0OrganizationId =
        options.auth0OrganizationId?.trim() ||
        getActiveAuth0OrganizationId() ||
        this.defaultOrganizationId;

      const authorizationParams: Record<string, string> = {
        audience: this.audience,
      };
      if (auth0OrganizationId) {
        authorizationParams.organization = auth0OrganizationId;
      }

      return await this.sdk.getAccessTokenSilently({
        authorizationParams,
        ...(options.forceRefresh ? { cacheMode: "off" as const } : {}),
      });
    } catch {
      return null;
    }
  }

  async switchOrganisation(input: SwitchOrganisationInput): Promise<void> {
    const auth0OrganizationId = input.auth0OrganizationId?.trim();
    if (!auth0OrganizationId) {
      throw new Error(
        "Cannot switch organisation: Auth0 Organization id is not linked on this IMS organisation"
      );
    }

    const token = await this.getAccessToken({
      auth0OrganizationId,
      forceRefresh: true,
    });
    if (!token) {
      throw new Error(
        "Cannot switch organisation: failed to acquire Auth0 access token for the selected organisation"
      );
    }

    // Persist only after a successful token acquisition (M5).
    setActiveOrganisationContext({
      organizationId: input.organizationId,
      auth0OrganizationId,
    });
  }

  async login(options?: LoginOptions): Promise<void> {
    const authorizationParams: Record<string, string> = {
      audience: this.audience,
    };
    if (options?.mode === "signup") {
      authorizationParams.screen_hint = "signup";
    }
    // Only bind an Auth0 Organization when explicitly requested or already active.
    // Self-signup must not force VITE_AUTH0_ORGANIZATION_ID on every login.
    if (options?.includeOrganization) {
      const auth0OrganizationId =
        getActiveAuth0OrganizationId() || this.defaultOrganizationId;
      if (auth0OrganizationId) {
        authorizationParams.organization = auth0OrganizationId;
      }
    } else {
      const active = getActiveAuth0OrganizationId();
      if (active) {
        authorizationParams.organization = active;
      }
    }
    await this.sdk.loginWithRedirect({
      appState: {
        returnTo: options?.returnTo ?? "/",
      },
      authorizationParams,
    });
  }

  async loginWithPassword(_credentials: PasswordCredentials): Promise<void> {
    void _credentials;
    throw new Error(
      "Auth0AuthClient does not support password login; use BffAuthClient"
    );
  }

  async register(_credentials: RegisterCredentials): Promise<void> {
    void _credentials;
    throw new Error(
      "Auth0AuthClient does not support register; use BffAuthClient"
    );
  }

  async requestPasswordReset(_input: { email: string }): Promise<void> {
    void _input;
    throw new Error(
      "Auth0AuthClient does not support password reset; use BffAuthClient"
    );
  }

  async logout(options?: { returnTo?: string }): Promise<void> {
    clearActiveOrganisation();
    await this.sdk.logout({
      logoutParams: {
        returnTo: options?.returnTo ?? window.location.origin,
      },
    });
  }
}
