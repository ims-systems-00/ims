/**
 * Phase 3 document hybrid retrieval helpers.
 * Lexical path is live via AiContextPort.searchDocuments.
 * Embedding path is prepared: when an embedder is wired, blend scores.
 */

export type DocumentHybridHit = {
  id: string;
  score: number;
  source: "lexical" | "vector" | "hybrid";
};

export type DocumentEmbedder = {
  embed(text: string): Promise<number[]>;
  search(input: {
    organizationId: string;
    vector: number[];
    limit: number;
  }): Promise<Array<{ id: string; score: number }>>;
};

/**
 * Reciprocal-rank fusion of lexical ordering + optional vector hits.
 * Without an embedder, returns lexical ids in order with decaying scores.
 */
export function fuseDocumentRanks(
  lexicalIds: string[],
  vectorHits: Array<{ id: string; score: number }> = [],
  k = 60
): DocumentHybridHit[] {
  const scores = new Map<string, { score: number; source: DocumentHybridHit["source"] }>();

  lexicalIds.forEach((id, index) => {
    const add = 1 / (k + index + 1);
    scores.set(id, { score: add, source: "lexical" });
  });

  vectorHits.forEach((hit, index) => {
    const add = 1 / (k + index + 1);
    const prev = scores.get(hit.id);
    if (prev) {
      scores.set(hit.id, {
        score: prev.score + add,
        source: "hybrid",
      });
    } else {
      scores.set(hit.id, { score: add, source: "vector" });
    }
  });

  return [...scores.entries()]
    .map(([id, row]) => ({ id, score: row.score, source: row.source }))
    .sort((a, b) => b.score - a.score);
}

/**
 * Run hybrid search when embedder present; otherwise lexical-only ids.
 */
export async function hybridDocumentSearch(input: {
  organizationId: string;
  query: string;
  lexicalIds: string[];
  embedder?: DocumentEmbedder | null;
  limit?: number;
}): Promise<DocumentHybridHit[]> {
  const limit = Math.min(10, Math.max(1, input.limit ?? 6));
  if (!input.embedder) {
    return fuseDocumentRanks(input.lexicalIds.slice(0, limit)).slice(0, limit);
  }
  const vector = await input.embedder.embed(input.query);
  const vectorHits = await input.embedder.search({
    organizationId: input.organizationId,
    vector,
    limit,
  });
  return fuseDocumentRanks(input.lexicalIds, vectorHits).slice(0, limit);
}
