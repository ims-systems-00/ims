/**
 * Resolve / rewrite Alice markdown links so in-app deep links always use the
 * real browser origin and BrowserRouter paths (never hash routes or invented hosts).
 */

const IMS_APP_PATH =
  /^\/(?:tasks|risks|incidents|audits|ofi|compliance|documents|document-management|documenttrees|actions|dashboard|home|settings|organisation|organization|users|people|email-campaign|data-import|notifications|cips|suppliers|customers)(?:\/|\?|#|$)/i;

export function getAliceAppOrigin(
  fallback = typeof window !== "undefined" ? window.location.origin : ""
): string {
  return fallback.replace(/\/+$/, "");
}

export function isImsAppPath(pathname: string): boolean {
  return IMS_APP_PATH.test(pathname);
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

function parseAppLocation(pathWithQuery: string): {
  pathname: string;
  search: string;
  hash: string;
} | null {
  const cleaned = pathWithQuery.trim();
  if (!cleaned.startsWith("/")) return null;
  try {
    const parsed = new URL(cleaned, "http://alice.local");
    if (!isImsAppPath(parsed.pathname)) return null;
    return {
      pathname: parsed.pathname,
      search: parsed.search,
      // Drop legacy hash-router fragments from in-app links.
      hash: "",
    };
  } catch {
    return null;
  }
}

/**
 * Extract a BrowserRouter location from relative, absolute, or legacy `/#/…` links.
 */
export function extractAliceAppLocation(
  href: string | undefined | null,
  origin = getAliceAppOrigin()
): { pathname: string; search: string; hash: string } | null {
  if (!href) return null;
  const trimmed = href.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("#/")) {
    return parseAppLocation(trimmed.slice(1));
  }

  if (trimmed.startsWith("/#/")) {
    return parseAppLocation(trimmed.slice(2));
  }

  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return parseAppLocation(trimmed);
  }

  try {
    const parsed = new URL(trimmed, origin || "http://localhost");
    if (parsed.hash.startsWith("#/")) {
      // Legacy Angular-style hash route: http://host/#/documents/...
      return parseAppLocation(parsed.hash.slice(1));
    }
    if (isImsAppPath(parsed.pathname)) {
      return {
        pathname: parsed.pathname,
        search: parsed.search,
        hash: "",
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Router `to` value for in-app Alice links (path + query, no hash routing).
 */
export function aliceAppPath(
  href: string | undefined | null,
  origin = getAliceAppOrigin()
): string | null {
  const loc = extractAliceAppLocation(href, origin);
  if (!loc) return null;
  return `${loc.pathname}${loc.search}${loc.hash}`;
}

/**
 * Turn a markdown/href target into a correct in-app path or external URL.
 */
export function resolveAliceHref(
  href: string | undefined | null,
  origin = getAliceAppOrigin()
): string {
  if (!href) return "#";
  const trimmed = href.trim();
  if (!trimmed) return "#";

  const appPath = aliceAppPath(trimmed, origin);
  if (appPath) return appPath;

  try {
    return new URL(trimmed, origin || "http://localhost").href;
  } catch {
    return trimmed;
  }
}

export function isAliceInAppHref(
  href: string | undefined | null,
  origin = getAliceAppOrigin()
): boolean {
  return aliceAppPath(href, origin) != null;
}

/**
 * Short label when link text is a raw URL / empty; keep meaningful titles.
 */
export function aliceLinkLabel(
  href: string | undefined | null,
  text: string,
  origin = getAliceAppOrigin()
): string {
  const trimmed = text.trim();
  const appPath = aliceAppPath(href, origin);
  const looksLikeObjectId = /^[a-f0-9]{24}$/i.test(trimmed);
  const looksLikeUrl =
    !trimmed ||
    looksLikeObjectId ||
    /^https?:\/\//i.test(trimmed) ||
    trimmed.startsWith("/#/") ||
    trimmed.startsWith("#/") ||
    (trimmed.startsWith("/") && trimmed === (appPath ?? trimmed)) ||
    (appPath != null &&
      (trimmed === appPath ||
        trimmed.endsWith(appPath) ||
        trimmed.includes(appPath)));

  if (!looksLikeUrl) return trimmed;

  const path = appPath ?? "";
  if (path.includes("/documents")) return "View document";
  if (path.startsWith("/tasks")) return "View task";
  if (path.startsWith("/risks")) return "View risk";
  if (path.startsWith("/incidents")) return "View incident";
  if (path.startsWith("/audits")) return "View audit";
  if (path.startsWith("/ofi") || path.startsWith("/cips")) return "View OFI";
  if (path.startsWith("/compliance")) return "View control";
  if (path.startsWith("/users") || path.startsWith("/people")) return "View user";
  if (path.startsWith("/suppliers")) return "View supplier";
  if (path.startsWith("/customers")) return "View customer";
  if (appPath) return "View";
  return "Open link";
}

/**
 * Normalize absolute / hash-router IMS links inside assistant Markdown.
 * Bare URL autolinks become `[View …](/path)` so the UI never shows raw URLs.
 */
export function rewriteAliceMarkdownAppUrls(
  markdown: string,
  origin = getAliceAppOrigin()
): string {
  if (!markdown) return markdown;

  let next = markdown.replace(
    /\[([^\]]*)\]\((https?:\/\/[^)\s]+|\/#\/[^)\s]+|#\/[^)\s]+|\/[^)\s]*)\)/gi,
    (full, label: string, href: string) => {
      const appPath = aliceAppPath(href, origin);
      if (!appPath) return full;
      const text = aliceLinkLabel(href, label, origin);
      return `[${text}](${appPath})`;
    }
  );

  next = next.replace(/https?:\/\/[^\s<>()\[\]"']+/gi, (match) => {
    const { url, trailing } = splitTrailingPunctuation(match);
    const appPath = aliceAppPath(url, origin);
    if (!appPath) return match;
    const label = aliceLinkLabel(url, url, origin);
    return `[${label}](${appPath})${trailing}`;
  });

  next = next.replace(/(?:^|[\s(])(\/#\/[^\s<>()\[\]"']+|#\/[^\s<>()\[\]"']+)/g, (match, href: string) => {
    const prefix = match.slice(0, match.length - href.length);
    const appPath = aliceAppPath(href, origin);
    if (!appPath) return match;
    const label = aliceLinkLabel(href, href, origin);
    return `${prefix}[${label}](${appPath})`;
  });

  return next;
}
