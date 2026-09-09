/**
 * Frontend authentication port.
 *
 * Real Auth0 integration will be provided later by senior engineers.
 * UI and data layers must depend on this port, not on Auth0 SDKs directly.
 *
 * @see docs/architecture/SECURITY_ARCHITECTURE.md
 */

export type ClientIdentity = {
  subjectId: string;
  email?: string;
  organizationId?: string;
};

export interface AuthClient {
  getIdentity(): Promise<ClientIdentity | null>;
  /** Optional convenience for route guards once wired to Next.js. */
  isAuthenticated(): Promise<boolean>;
}
