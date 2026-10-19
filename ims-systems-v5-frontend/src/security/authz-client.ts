/**
 * Frontend authorization port.
 *
 * Auth0 mode: ApiAuthzClient → POST /security/check (OpenFGA on backend).
 * Stub mode: DevelopmentAuthzClient (always allow).
 *
 * @see docs/architecture/SECURITY_ARCHITECTURE.md
 * @see docs/decisions/0006-auth-ports-and-dev-stub.md
 */

import type { ClientIdentity } from "./auth-client";

export type ClientAuthorizationCheck = {
  identity: ClientIdentity;
  action: string;
  resourceType: string;
  resourceId?: string;
  organizationId?: string;
};

export interface AuthzClient {
  allow(check: ClientAuthorizationCheck): Promise<boolean>;
}
