/**
 * Frontend authentication port.
 *
 * Real Auth0 integration will be provided later by senior engineers.
 * UI and data layers must depend on this port, not on Auth0 SDKs directly.
 *
 * @see docs/architecture/SECURITY_ARCHITECTURE.md
 * @see docs/decisions/0006-auth-ports-and-dev-stub.md
 */

export type ClientIdentity = {
  subjectId: string;
  email?: string;
  organizationId?: string;
};

export interface AuthClient {
  getIdentity(): Promise<ClientIdentity | null>;
  isAuthenticated(): Promise<boolean>;
}
