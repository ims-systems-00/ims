/**
 * Authentication port (backend).
 *
 * Real Auth0 adapter will be provided later by senior engineers.
 * Modules must depend on this port, not on Auth0 SDKs directly.
 *
 * @see docs/architecture/SECURITY_ARCHITECTURE.md
 * @see docs/decisions/0006-auth-ports-and-dev-stub.md
 */

export type SecurityIdentity = {
  /** Stable subject identifier from the auth provider (or stub). */
  subjectId: string;
  email?: string;
  /** Active organisation / tenant context when applicable (D-09: organizationId). */
  organizationId?: string;
};

/** Transport-agnostic request view for authentication adapters (D-20). */
export type AuthRequestView = {
  headers: Record<string, string | string[] | undefined>;
  cookies?: Record<string, string | undefined>;
};

export interface Authenticator {
  /**
   * Resolve the caller identity for a request.
   * Return null when unauthenticated.
   */
  authenticate(input: AuthRequestView): Promise<SecurityIdentity | null>;
}
