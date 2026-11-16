/**
 * Many inbox clients strip `data:image/...` from HTML. Rewrite those
 * sources to `cid:` and attach the bytes as inline images so the default
 * iMS logo (and any other embedded logos) actually render when sent.
 */

import type { EmailAttachment, OutgoingEmail } from "./types";

const DATA_URI_SRC_RE =
  /src=(["'])(data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+))\1/gi;

function parseDataUri(dataUri: string): {
  mime: string;
  contentBase64: string;
} | null {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/i.exec(
    dataUri.trim()
  );
  if (!match) return null;
  return {
    mime: match[1]!.toLowerCase(),
    contentBase64: match[2]!.replace(/\s+/g, ""),
  };
}

function extensionForMime(mime: string): string {
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("gif")) return "gif";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("svg")) return "svg";
  return "png";
}

/**
 * Replace every `src="data:image/..."` in the HTML with a unique cid and
 * append matching inline attachments. Idempotent for already-cid sources.
 */
export function prepareOutgoingEmailImages(
  message: OutgoingEmail
): OutgoingEmail {
  const existing = message.attachments ? [...message.attachments] : [];
  const seenCids = new Set(
    existing
      .map((item) => item.contentId?.trim())
      .filter((value): value is string => Boolean(value))
  );

  let html = message.html;
  const additions: EmailAttachment[] = [];
  let index = 0;

  html = html.replace(DATA_URI_SRC_RE, (_full, quote: string, dataUri: string) => {
    const parsed = parseDataUri(dataUri);
    if (!parsed) {
      return `src=${quote}${dataUri}${quote}`;
    }

    const contentId = `ims-inline-logo-${index}@imssystems.tech`;
    index += 1;
    if (!seenCids.has(contentId)) {
      seenCids.add(contentId);
      additions.push({
        filename: `logo-${index}.${extensionForMime(parsed.mime)}`,
        contentBase64: parsed.contentBase64,
        type: parsed.mime,
        disposition: "inline",
        contentId,
      });
    }
    return `src=${quote}cid:${contentId}${quote}`;
  });

  if (additions.length === 0 && html === message.html) {
    return message;
  }

  return {
    ...message,
    html,
    attachments: [...existing, ...additions],
  };
}
