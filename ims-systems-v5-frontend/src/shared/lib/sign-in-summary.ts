/**
 * One-shot flag: show the action summary after the user enters an
 * organisation (sign-in org picker or org switcher). Session storage, so a
 * page refresh does not show it again but every new sign-in does.
 */
const KEY = "ims.actionSummary.pending";

export function requestSignInSummary(): void {
  try {
    window.sessionStorage.setItem(KEY, "1");
  } catch {
    // Storage unavailable: the summary is simply skipped.
  }
}

export function hasPendingSignInSummary(): boolean {
  try {
    return window.sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function consumeSignInSummary(): void {
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
