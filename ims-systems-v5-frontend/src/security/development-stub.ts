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

export const DEV_STUB_IDENTITY: ClientIdentity = {
  subjectId: "dev-stub-user",
  email: "dev-stub@example.local",
  organizationId: DEV_STUB_ORGANIZATION_ID,
};

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
