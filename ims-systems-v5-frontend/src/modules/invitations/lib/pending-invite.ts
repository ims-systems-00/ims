/**
 * Persist invite token across register/login so new users can auto-join
 * the invited organisation instead of creating their own.
 */

const STORAGE_KEY = "ims-v5-pending-invite";

export type PendingInvite = {
  token: string;
  email?: string;
  organisationName?: string;
};

export function acceptInvitationPath(token: string, auto = false): string {
  const base = `/auth/onboard/accept-invitation/${encodeURIComponent(token)}`;
  return auto ? `${base}?auto=1` : base;
}

export function getPendingInvite(): PendingInvite | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingInvite;
    if (!parsed?.token?.trim()) return null;
    return {
      token: parsed.token.trim(),
      email: parsed.email?.trim().toLowerCase() || undefined,
      organisationName: parsed.organisationName?.trim() || undefined,
    };
  } catch {
    return null;
  }
}

export function setPendingInvite(input: PendingInvite): void {
  if (typeof window === "undefined") return;
  const token = input.token.trim();
  if (!token) return;
  try {
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        token,
        email: input.email?.trim().toLowerCase() || undefined,
        organisationName: input.organisationName?.trim() || undefined,
      } satisfies PendingInvite)
    );
  } catch {
    // ignore quota / private mode
  }
}

export function clearPendingInvite(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
