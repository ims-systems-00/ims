/**
 * Frontend authorization port.
 *
 * Real OpenFGA-backed checks will be provided later by senior engineers.
 *
 * @see docs/architecture/SECURITY_ARCHITECTURE.md
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
