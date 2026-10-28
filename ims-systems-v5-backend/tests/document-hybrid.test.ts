import { describe, expect, it } from "vitest";
import { fuseDocumentRanks } from "../src/modules/ai/lib/document-hybrid";

describe("document hybrid fusion", () => {
  it("ranks lexical ids when no vector hits", () => {
    const hits = fuseDocumentRanks(["a", "b", "c"]);
    expect(hits[0]?.id).toBe("a");
    expect(hits[0]?.source).toBe("lexical");
  });

  it("boosts ids present in both lexical and vector lists", () => {
    const hits = fuseDocumentRanks(
      ["a", "b", "c"],
      [
        { id: "c", score: 0.9 },
        { id: "a", score: 0.5 },
      ]
    );
    expect(hits.find((h) => h.id === "c")?.source).toBe("hybrid");
    expect(hits[0]?.score).toBeGreaterThan(hits[hits.length - 1]!.score);
  });
});
