/**
 * Authentication port (backend).
 *
 * Production org-user adapter: Auth0 Bearer JWT (`Auth0Authenticator`, D-16/D-20).
 * Modules must depend on this port, not on Auth0 SDKs directly.
 *
 * @see docs/architecture/SECURITY_ARCHITECTURE.md
 * @see docs/decisions/0006-auth-ports-and-dev-stub.md
 * @see docs/security/AUTH_ROLLOUT_TRACKER.md
 */

export type SecurityIdentity = {
  /**
   * Stable subject identifier.
   * Stub: synthetic id. Auth0 adapter: IMS user ObjectId (not Auth0 `sub`).
   */
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
