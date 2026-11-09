/** Helpers for activity `value` HTML / legacy plain / Draft.js raw. */

const HTML_TAG_RE = /<[a-z][\s\S]*>/i;
const DRAFT_HINT_RE = /"blocks"\s*:/;

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function extractDraftPlainText(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed.startsWith("{") || !DRAFT_HINT_RE.test(trimmed)) return null;
  try {
    const raw = JSON.parse(trimmed) as {
      blocks?: Array<{ text?: string }>;
    };
    if (!Array.isArray(raw.blocks)) return null;
    return raw.blocks
      .map((block) => (typeof block.text === "string" ? block.text : ""))
      .join("\n")
      .trim();
  } catch {
    return null;
  }
}

/** Convert stored activity value into HTML TipTap can load. */
export function normalizeActivityHtml(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const draftPlain = extractDraftPlainText(trimmed);
  if (draftPlain != null) {
    if (!draftPlain) return "";
    return `<p>${escapeHtml(draftPlain).replace(/\n/g, "<br>")}</p>`;
  }

  if (!HTML_TAG_RE.test(trimmed)) {
    return `<p>${escapeHtml(trimmed).replace(/\n/g, "<br>")}</p>`;
  }

  return trimmed;
}

/** True when the editor has no meaningful text or embedded media. */
export function isActivityValueEmpty(value: string): boolean {
  const html = normalizeActivityHtml(value);
  if (!html) return true;
  if (/<img[\s>]/i.test(html)) return false;
  if (/data-bucket\s*=/i.test(html)) return false;
  const text = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/\u00a0/g, " ")
    .trim();
  return text.length === 0;
}
