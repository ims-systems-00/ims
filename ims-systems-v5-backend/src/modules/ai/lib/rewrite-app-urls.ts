/**
 * Rewrite invented / legacy absolute IMS deep links to BrowserRouter paths
 * under the configured CLIENT_URL origin (no hash routing).
 */

const IMS_APP_PATH =
  /^\/(?:tasks|risks|incidents|audits|ofi|compliance|documents|document-management|documenttrees|actions|dashboard|home|settings|organisation|organization|users|people|email-campaign|data-import|notifications|cips|suppliers|customers)(?:\/|\?|#|$)/i;

export function normalizeClientAppOrigin(origin: string | undefined | null): string {
  return (origin ?? "").trim().replace(/\/+$/, "");
}

export function isImsAppPath(pathname: string): boolean {
  return IMS_APP_PATH.test(pathname);
}

function parseAppLocation(pathWithQuery: string): string | null {
  const cleaned = pathWithQuery.trim();
  if (!cleaned.startsWith("/")) return null;
  try {
    const parsed = new URL(cleaned, "http://alice.local");
    if (!isImsAppPath(parsed.pathname)) return null;
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return null;
  }
}

/**
 * Normalize relative, absolute, or legacy `/#/…` links to a root-relative path.
 */
export function normalizeAliceAppPath(
  href: string | undefined | null
): string | null {
  if (!href) return null;
  const trimmed = href.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("#/")) return parseAppLocation(trimmed.slice(1));
  if (trimmed.startsWith("/#/")) return parseAppLocation(trimmed.slice(2));
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return parseAppLocation(trimmed);
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.hash.startsWith("#/")) {
      return parseAppLocation(parsed.hash.slice(1));
    }
    if (isImsAppPath(parsed.pathname)) {
      return `${parsed.pathname}${parsed.search}`;
    }
    return null;
  } catch {
    return null;
  }
}

export function toAbsoluteAppHref(
  href: string,
  origin: string | undefined | null
): string {
  const base = normalizeClientAppOrigin(origin);
  const path = normalizeAliceAppPath(href) ?? href;
  if (!path.startsWith("/") || path.startsWith("//")) return path;
  if (!base) return path;
  return `${base}${path}`;
}

function splitTrailingPunctuation(raw: string): {
  url: string;
  trailing: string;
} {
  let url = raw;
  let trailing = "";
  while (url.length > 0 && /[.,;:!?)\]}>'"]$/u.test(url)) {
    trailing = `${url.slice(-1)}${trailing}`;
    url = url.slice(0, -1);
  }
  return { url, trailing };
}

/**
 * Replace wrong-host or hash-router IMS links with root-relative BrowserRouter paths.
 * Relative paths are preferred so the SPA opens the correct screen.
 */
export function rewriteAliceAppUrls(
  text: string,
  _origin: string | undefined | null
): string {
  if (!text) return text;

  let next = text.replace(
    /\[([^\]]*)\]\((https?:\/\/[^)\s]+|\/#\/[^)\s]+|#\/[^)\s]+|\/[^)\s]*)\)/gi,
    (full, label: string, href: string) => {
      const path = normalizeAliceAppPath(href);
      if (!path) return full;
      const looksLikeUrl =
        !String(label).trim() ||
        /^https?:\/\//i.test(label) ||
        String(label).includes("/#/") ||
        String(label).startsWith("#/") ||
        String(label) === href ||
        String(label).endsWith(path);
      const textLabel = looksLikeUrl ? "View" : String(label).trim();
      return `[${textLabel}](${path})`;
    }
  );

  next = next.replace(/https?:\/\/[^\s<>()\[\]"']+/gi, (match) => {
    const { url, trailing } = splitTrailingPunctuation(match);
    const path = normalizeAliceAppPath(url);
    if (!path) return match;
    return `[View](${path})${trailing}`;
  });

  next = next.replace(
    /(?:^|[\s(])(\/#\/[^\s<>()\[\]"']+|#\/[^\s<>()\[\]"']+)/g,
    (match, href: string) => {
      const prefix = match.slice(0, match.length - href.length);
      const path = normalizeAliceAppPath(href);
      if (!path) return match;
      return `${prefix}[View](${path})`;
    }
  );

  return next;
}
