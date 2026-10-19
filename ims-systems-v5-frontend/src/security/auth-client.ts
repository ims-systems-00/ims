/**
 * Frontend authentication port.
 *
 * Production org-user adapter: Auth0 SPA (`Auth0AuthClient`, D-16/D-20).
 * UI and data layers must depend on this port, not on Auth0 SDKs directly.
 *
 * @see docs/architecture/SECURITY_ARCHITECTURE.md
 * @see docs/decisions/0006-auth-ports-and-dev-stub.md
 * @see docs/security/AUTH_ROLLOUT_TRACKER.md
 */

export type ClientIdentity = {
  subjectId: string;
  email?: string;
  organizationId?: string;
};

export type GetAccessTokenOptions = {
  /** Auth0 Organization id for this token request (org switch). */
  auth0OrganizationId?: string;
  /** Force a fresh token (org switch). */
  forceRefresh?: boolean;
};

export type SwitchOrganisationInput = {
  /** IMS organisation ObjectId */
  organizationId: string;
  /** Auth0 Organization id — required in Auth0 mode */
  auth0OrganizationId?: string | null;
};

export type LoginOptions = {
  /** Path to return to after Auth0 redirect (default `/`). */
  returnTo?: string;
  /**
   * `signup` opens Auth0’s sign-up experience (self-registration).
   * Prefer `register` / `loginWithPassword` for the embedded BFF path.
   */
  mode?: "login" | "signup";
  /**
   * When true, request an Auth0 Organization-bound token (existing tenants).
   * Default false so new users can sign up without a pre-existing org.
   */
  includeOrganization?: boolean;
};

export type PasswordCredentials = {
  email: string;
  password: string;
};

export type RegisterCredentials = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
};

export interface AuthClient {
  getIdentity(): Promise<ClientIdentity | null>;
  isAuthenticated(): Promise<boolean>;
  /** Access token for API Bearer auth. Stub returns null. */
  getAccessToken(options?: GetAccessTokenOptions): Promise<string | null>;
  /**
   * Switch active organisation.
   * Auth0: acquire token for the Auth0 org first, then persist IMS + Auth0 ids.
   * Stub: persist IMS id only.
   */
  switchOrganisation(input: SwitchOrganisationInput): Promise<void>;
  /** Optional redirect-based login (legacy / social). Prefer password methods. */
  login(options?: LoginOptions): Promise<void>;
  /** Email/password login via V5 `/auth/login` BFF. */
  loginWithPassword(credentials: PasswordCredentials): Promise<void>;
  /** Self-signup via V5 `/auth/register` BFF. */
  register(credentials: RegisterCredentials): Promise<void>;
  /** Trigger Auth0 change-password email via V5 `/auth/forgot-password`. */
  requestPasswordReset(input: { email: string }): Promise<void>;
  logout(options?: { returnTo?: string }): Promise<void>;
}
