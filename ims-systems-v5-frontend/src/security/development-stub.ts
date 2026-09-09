/**
 * Development-only frontend security stub.
 *
 * WARNING: Must never be enabled by production configuration.
 * Exact env flags and contract remain pending approval (D-06).
 *
 * @see docs/architecture/SECURITY_ARCHITECTURE.md
 */

import type { AuthClient, ClientIdentity } from "./auth-client";
import type { AuthzClient, ClientAuthorizationCheck } from "./authz-client";

const DEV_IDENTITY: ClientIdentity = {
  subjectId: "dev-stub-user",
  email: "dev-stub@example.local",
  organizationId: "dev-stub-org",
};

export class DevelopmentAuthClient implements AuthClient {
  async getIdentity(): Promise<ClientIdentity | null> {
    return DEV_IDENTITY;
  }

  async isAuthenticated(): Promise<boolean> {
    return true;
  }
}

export class DevelopmentAuthzClient implements AuthzClient {
  async allow(_check: ClientAuthorizationCheck): Promise<boolean> {
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
