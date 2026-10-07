const STORAGE_KEY = "ims-v5-active-org-id";

const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

/**
 * Dev stand-in for session org binding (V4: x-org-id + refresh token).
 * Sent as `x-org-id` on API requests when set.
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

export function setActiveOrganisationId(organizationId: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!organizationId) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    if (!OBJECT_ID_RE.test(organizationId)) return;
    window.localStorage.setItem(STORAGE_KEY, organizationId);
  } catch {
    // ignore quota / private mode
  }
}
