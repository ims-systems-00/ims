/**
 * Reject invented IMS references in Alice answers (Phase 3 grounding).
 */

import type { AiContextCard } from "../types/chat";

const REF_PATTERNS = [
  /\bRK-[\w.-]+\b/gi,
  /\bTASK-[\w.-]+\b/gi,
  /\bINC-[\w.-]+\b/gi,
  /\bAUD-[\w.-]+\b/gi,
  /\bDOC-[\w.-]+\b/gi,
  /\bOFI-[\w.-]+\b/gi,
  /\bCIP-[\w.-]+\b/gi,
];

export function extractClaimedReferences(text: string): string[] {
  const found = new Set<string>();
  for (const re of REF_PATTERNS) {
    re.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      found.add(match[0]!);
    }
  }
  return [...found];
}

export function allowedReferencesFromCards(cards: AiContextCard[]): Set<string> {
  const allowed = new Set<string>();
  for (const card of cards) {
    if (card.reference?.trim()) allowed.add(card.reference.trim());
    if (card.id?.trim()) allowed.add(card.id.trim());
  }
  return allowed;
}

export type CitationVerifyResult = {
  ok: boolean;
  invented: string[];
  sanitizedText: string;
};

/**
 * If the model invents refs not present in tool cards, append a correction note.
 */
export function verifyAliceCitations(
  answer: string,
  cards: AiContextCard[]
): CitationVerifyResult {
  const claimed = extractClaimedReferences(answer);
  if (claimed.length === 0) {
    return { ok: true, invented: [], sanitizedText: answer };
  }
  const allowed = allowedReferencesFromCards(cards);
  const invented = claimed.filter((ref) => {
    const lower = ref.toLowerCase();
    return ![...allowed].some((a) => {
      const al = a.toLowerCase();
      return al === lower || al.includes(lower) || lower.includes(al);
    });
  });
  if (invented.length === 0) {
    return { ok: true, invented: [], sanitizedText: answer };
  }
  const note =
    `\n\n_Note: Some references in the draft were not returned by live tools ` +
    `(${invented.join(", ")}) and should be ignored. Rely only on cited records above._`;
  return {
    ok: false,
    invented,
    sanitizedText: `${answer.trim()}${note}`,
  };
}
