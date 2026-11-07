/**
 * Coerce V4 Draft.js raw JSON (or plain strings) into displayable text.
 * Migrated records should already be plain, but this keeps the UI resilient.
 */
export function plainTextFromPossiblyRich(raw: unknown): string {
  if (raw == null) return "";
  if (typeof raw === "object") {
    return draftBlocksToText(raw as { blocks?: unknown });
  }
  const trimmed = String(raw).trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("{") && trimmed.includes('"blocks"')) {
    try {
      return draftBlocksToText(JSON.parse(trimmed) as { blocks?: unknown });
    } catch {
      return trimmed;
    }
  }
  return trimmed;
}

function draftBlocksToText(parsed: { blocks?: unknown }): string {
  if (!Array.isArray(parsed?.blocks)) return "";
  return parsed.blocks
    .map((block) => {
      if (!block || typeof block !== "object") return "";
      return String((block as { text?: unknown }).text ?? "");
    })
    .join("\n")
    .trim();
}
