/**
 * Authorization port (backend).
 *
 * Real OpenFGA adapter will be provided later by senior engineers.
 * Modules must depend on this port, not on OpenFGA SDKs directly.
 *
 * @see docs/architecture/SECURITY_ARCHITECTURE.md
 * @see docs/decisions/0006-auth-ports-and-dev-stub.md
 */

import type { SecurityIdentity } from "./authenticator";

export type AuthorizationCheck = {
  identity: SecurityIdentity;
  action: string;
  resourceType: string;
  resourceId?: string;
  organizationId?: string;
};

export interface Authorizer {
  allow(check: AuthorizationCheck): Promise<boolean>;
}
