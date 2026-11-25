/**
 * Public frontend origin used in email CTAs, invites, and billing redirects.
 * Never silently fall back to localhost when a configured value exists.
 */

const LOOPBACK_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
]);

/** Strip trailing slashes from a configured CLIENT_URL. */
export function resolveClientAppUrl(
  clientUrl: string | undefined | null
): string {
  return (clientUrl ?? "").trim().replace(/\/+$/, "");
}

/**
 * Dev-only fallback when CLIENT_URL is unset.
 * Production must set CLIENT_URL (enforced in env schema).
 */
export function resolveClientAppUrlOrDevFallback(
  clientUrl: string | undefined | null,
  fallback = "http://localhost:3000"
): string {
  const resolved = resolveClientAppUrl(clientUrl);
  return resolved || fallback.replace(/\/+$/, "");
}

export function isLoopbackOrLocalUrl(url: string | undefined | null): boolean {
  const value = (url ?? "").trim();
  if (!value) return true;
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase();
    return (
      LOOPBACK_HOSTS.has(host) ||
      host.endsWith(".local") ||
      host.endsWith(".localhost")
    );
  } catch {
    return true;
  }
}

/** True when a URL is usable as an email CTA from external mail clients. */
export function isPublicEmailHref(url: string | undefined | null): boolean {
  const value = (url ?? "").trim();
  if (!value) return false;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }
    return !isLoopbackOrLocalUrl(value);
  } catch {
    return false;
  }
}
