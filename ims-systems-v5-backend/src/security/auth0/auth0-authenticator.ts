/**
 * Auth0 Bearer authenticator (org-user) — auth rollout M3.
 *
 * AuthZ remains separate (OpenFGA in M6). This adapter only resolves identity.
 */

import type {
  Authenticator,
  AuthRequestView,
  SecurityIdentity,
} from "../authenticator";
import type { AccessTokenVerifier } from "./jwt-verifier";

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

export type Auth0AuthenticatorLookups = {
  findUserByAuth0SubjectId(
    auth0SubjectId: string
  ): Promise<Auth0LinkedUser | null>;
  findOrganisationByAuth0OrganizationId(
    auth0OrganizationId: string
  ): Promise<Auth0LinkedOrganisation | null>;
  hasMembership(userId: string, organizationId: string): Promise<boolean>;
};

export type Auth0AuthenticatorDeps = {
  verifier: AccessTokenVerifier;
  lookups: Auth0AuthenticatorLookups;
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
 * Validates Auth0 access tokens and binds them to IMS user + organisation.
 * Returns null for any AuthN failure (fail closed → 401 upstream).
 */
export class Auth0Authenticator implements Authenticator {
  private readonly verifier: AccessTokenVerifier;
  private readonly lookups: Auth0AuthenticatorLookups;

  constructor(deps: Auth0AuthenticatorDeps) {
    this.verifier = deps.verifier;
    this.lookups = deps.lookups;
  }

  async authenticate(input: AuthRequestView): Promise<SecurityIdentity | null> {
    const token = extractBearerToken(input.headers);
    if (!token) return null;

    const verified = await this.verifier.verify(token);
    if (!verified) return null;

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
}
