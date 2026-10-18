/**
 * Auth0 Bearer authenticator (org-user) — auth rollout M3+.
 *
 * Supports:
 * - Org-bound tokens (`org_id`) → IMS user + organisation + membership (strict).
 * - User-only tokens (no `org_id`) → JIT IMS user; optional `x-org-id` when member
 *   (self-signup → create organisation onboard).
 *
 * AuthZ remains separate (OpenFGA).
 */

import type {
  Authenticator,
  AuthRequestView,
  SecurityIdentity,
} from "../authenticator";
import type { AccessTokenVerifier } from "./jwt-verifier";
import { fetchAuth0UserInfo } from "./auth0-userinfo";

export type Auth0LinkedUser = {
  id: string;
  email: string;
  systemAccessStatus: string;
  lockedUntil: Date | null;
};

export type Auth0LinkedOrganisation = {
  id: string;
  status: string;
};

export type Auth0EnsureUserInput = {
  auth0SubjectId: string;
  email?: string;
  name?: string;
};

export type Auth0AuthenticatorLookups = {
  findUserByAuth0SubjectId(
    auth0SubjectId: string
  ): Promise<Auth0LinkedUser | null>;
  /**
   * Resolve or create an IMS user for a verified Auth0 subject (self-signup).
   */
  ensureUserFromAuth0(input: Auth0EnsureUserInput): Promise<Auth0LinkedUser | null>;
  findOrganisationByAuth0OrganizationId(
    auth0OrganizationId: string
  ): Promise<Auth0LinkedOrganisation | null>;
  hasMembership(userId: string, organizationId: string): Promise<boolean>;
};

export type Auth0AuthenticatorDeps = {
  verifier: AccessTokenVerifier;
  lookups: Auth0AuthenticatorLookups;
  /**
   * Auth0 tenant domain for /userinfo when access tokens omit email.
   * Example: `devmehrab.uk.auth0.com`
   */
  domain?: string;
  fetchFn?: typeof fetch;
};

function headerValue(
  headers: AuthRequestView["headers"],
  name: string
): string | undefined {
  const raw = headers[name] ?? headers[name.toLowerCase()];
  if (Array.isArray(raw)) return raw[0];
  return typeof raw === "string" ? raw : undefined;
}

function extractBearerToken(headers: AuthRequestView["headers"]): string | null {
  const authorization = headerValue(headers, "authorization");
  if (!authorization) return null;
  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  return match?.[1]?.trim() || null;
}

function extractClientOrgHint(headers: AuthRequestView["headers"]): string | null {
  const raw = headerValue(headers, "x-org-id");
  if (!raw) return null;
  const trimmed = raw.trim();
  return trimmed || null;
}

function isUserAllowed(user: Auth0LinkedUser, now: Date): boolean {
  if (user.systemAccessStatus !== "Active") return false;
  if (user.lockedUntil && user.lockedUntil.getTime() > now.getTime()) {
    return false;
  }
  return true;
}

/**
 * Validates Auth0 access tokens and binds them to IMS user (+ organisation when present).
 * Returns null for any AuthN failure (fail closed → 401 upstream).
 */
export class Auth0Authenticator implements Authenticator {
  private readonly verifier: AccessTokenVerifier;
  private readonly lookups: Auth0AuthenticatorLookups;
  private readonly domain?: string;
  private readonly fetchFn?: typeof fetch;

  constructor(deps: Auth0AuthenticatorDeps) {
    this.verifier = deps.verifier;
    this.lookups = deps.lookups;
    this.domain = deps.domain?.trim() || undefined;
    this.fetchFn = deps.fetchFn;
  }

  async authenticate(input: AuthRequestView): Promise<SecurityIdentity | null> {
    const token = extractBearerToken(input.headers);
    if (!token) return null;

    const verified = await this.verifier.verify(token);
    if (!verified) return null;

    // ── Org-bound token (existing tenant members) ──────────────────────────
    if (verified.orgId) {
      const [user, organisation] = await Promise.all([
        this.lookups.findUserByAuth0SubjectId(verified.sub),
        this.lookups.findOrganisationByAuth0OrganizationId(verified.orgId),
      ]);

      if (!user || !organisation) return null;
      if (!isUserAllowed(user, new Date())) return null;
      if (organisation.status !== "Running") return null;

      const member = await this.lookups.hasMembership(user.id, organisation.id);
      if (!member) return null;

      const clientOrgHint = extractClientOrgHint(input.headers);
      if (clientOrgHint && clientOrgHint !== organisation.id) {
        return null;
      }

      return {
        subjectId: user.id,
        email: verified.email ?? user.email,
        organizationId: organisation.id,
      };
    }

    // ── User-only token (self-signup / pre-tenant) ─────────────────────────
    let email = verified.email;
    let name = verified.name;

    // Password-grant access tokens often omit email; resolve via /userinfo.
    if ((!email || !email.includes("@")) && this.domain) {
      const profile = await fetchAuth0UserInfo({
        domain: this.domain,
        accessToken: token,
        fetchFn: this.fetchFn,
      });
      if (profile?.email?.includes("@")) {
        email = profile.email;
      }
      if (!name && profile?.name) {
        name = profile.name;
      } else if (!name && profile?.nickname) {
        name = profile.nickname;
      }
    }

    const user = await this.lookups.ensureUserFromAuth0({
      auth0SubjectId: verified.sub,
      email,
      name,
    });
    if (!user) return null;
    if (!isUserAllowed(user, new Date())) return null;

    const clientOrgHint = extractClientOrgHint(input.headers);
    if (clientOrgHint) {
      const member = await this.lookups.hasMembership(user.id, clientOrgHint);
      if (member) {
        return {
          subjectId: user.id,
          email: email ?? user.email,
          organizationId: clientOrgHint,
        };
      }
      // Stale x-org-id from a previous session — ignore and continue user-only
      // so self-signup / list-mine can proceed to onboard.
    }

    return {
      subjectId: user.id,
      email: email ?? user.email,
      organizationId: undefined,
    };
  }
}
