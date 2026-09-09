/**
 * Development-only security stub (D-06).
 *
 * WARNING: Must never be enabled when NODE_ENV=production.
 * Transport-agnostic — does not establish production cookie/bearer transport (D-20).
 */

import type { Authenticator, SecurityIdentity } from "./authenticator";
import type { Authorizer, AuthorizationCheck } from "./authorizer";

/** Deterministic ObjectId-shaped organisation id for local/dev (D-09). */
export const DEV_STUB_ORGANIZATION_ID = "000000000000000000000001";

export const DEV_STUB_IDENTITY: SecurityIdentity = {
  subjectId: "dev-stub-user",
  email: "dev-stub@example.local",
  organizationId: DEV_STUB_ORGANIZATION_ID,
};

export class DevelopmentAuthenticator implements Authenticator {
  async authenticate(): Promise<SecurityIdentity | null> {
    return DEV_STUB_IDENTITY;
  }
}

/** Permissive authorizer for local development/testing only. */
export class DevelopmentAuthorizer implements Authorizer {
  async allow(_check: AuthorizationCheck): Promise<boolean> {
    return true;
  }
}

export function assertDevelopmentStubAllowed(nodeEnv: string): void {
  if (nodeEnv === "production") {
    throw new Error(
      "Development security stub must not be used when NODE_ENV=production"
    );
  }
}
