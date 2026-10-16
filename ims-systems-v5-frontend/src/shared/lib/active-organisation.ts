const STORAGE_KEY = "ims-v5-active-org-id";
const AUTH0_STORAGE_KEY = "ims-v5-active-auth0-org-id";

const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

/**
 * Active IMS organisation for `x-org-id` (must match token-bound org in Auth0 mode).
 */
export function getActiveOrganisationId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (value && OBJECT_ID_RE.test(value)) return value;
    return null;
  } catch {
    return null;
  }
}

/**
 * Auth0 Organization id (`org_…`) used when requesting access tokens.
 */
export function getActiveAuth0OrganizationId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(AUTH0_STORAGE_KEY);
    return value?.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Persist IMS (+ optional Auth0) org binding.
 * Call only after a successful Auth0 token acquisition when using Auth0.
 */
export function setActiveOrganisationContext(input: {
  organizationId: string;
  auth0OrganizationId?: string | null;
}): void {
  if (typeof window === "undefined") return;
  if (!OBJECT_ID_RE.test(input.organizationId)) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, input.organizationId);
    const auth0Id = input.auth0OrganizationId?.trim();
    if (auth0Id) {
      window.localStorage.setItem(AUTH0_STORAGE_KEY, auth0Id);
    } else {
      window.localStorage.removeItem(AUTH0_STORAGE_KEY);
    }
  } catch {
    // ignore quota / private mode
  }
}

/** @deprecated Prefer setActiveOrganisationContext */
export function setActiveOrganisationId(organizationId: string | null): void {
  if (!organizationId) {
    clearActiveOrganisation();
    return;
  }
  setActiveOrganisationContext({ organizationId });
}

export function clearActiveOrganisation(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(AUTH0_STORAGE_KEY);
  } catch {
    // ignore
  }
}
