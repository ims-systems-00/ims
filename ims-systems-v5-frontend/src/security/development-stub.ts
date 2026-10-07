/**
 * Development-only frontend security stub (D-06).
 *
 * WARNING: Must never be enabled when NODE_ENV=production.
 * Transport-agnostic — does not establish production cookie/bearer transport (D-20).
 */

import type { AuthClient, ClientIdentity } from "./auth-client";
import type { AuthzClient, ClientAuthorizationCheck } from "./authz-client";

/** Deterministic ObjectId-shaped organisation id for local/dev (D-09). */
export const DEV_STUB_ORGANIZATION_ID = "000000000000000000000001";

/**
 * Demo directory user used for My Profile until real auth maps subject → user.
 * Matches Ada Lovelace from `pnpm seed:demo` (session subject stays `dev-stub-user`).
 */
export const DEV_STUB_PROFILE_USER_ID = "100000000000000000000001";

export const DEV_STUB_IDENTITY: ClientIdentity = {
  subjectId: "dev-stub-user",
  email: "dev-stub@example.local",
  organizationId: DEV_STUB_ORGANIZATION_ID,
};

/**
 * Resolve which Users directory id to load for the current session profile.
 * ObjectId subjects use themselves; the development stub maps to the demo user.
 */
export function resolveProfileUserId(
  identity: ClientIdentity | null | undefined
): string | undefined {
  if (!identity?.subjectId) return undefined;
  if (/^[a-fA-F0-9]{24}$/.test(identity.subjectId)) return identity.subjectId;
  return DEV_STUB_PROFILE_USER_ID;
}

export class DevelopmentAuthClient implements AuthClient {
  async getIdentity(): Promise<ClientIdentity | null> {
    return DEV_STUB_IDENTITY;
  }

  async isAuthenticated(): Promise<boolean> {
    return true;
  }
}

export class DevelopmentAuthzClient implements AuthzClient {
  async allow(_check: ClientAuthorizationCheck): Promise<boolean> {
    void _check;
    return true;
  }
}

export function assertDevelopmentStubAllowed(nodeEnv: string | undefined): void {
  if (nodeEnv === "production") {
    throw new Error(
      "Development security stub must not be used when NODE_ENV=production"
    );
  }
}
