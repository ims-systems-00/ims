import { describe, expect, it } from "vitest";
import {
  cardsToPromptBlock,
  RECORD_CONTEXT_CHAR_BUDGET,
  taskCard,
  toListCard,
} from "../src/modules/ai/lib/context-cards";

describe("context cards tiers + budget", () => {
  it("builds a compact task card with priority and due", () => {
    const card = taskCard({
      _id: "abc",
      reference: "TSK-1",
      name: "Close the loop",
      status: "Pending",
      priority: "High",
      dueDate: "2026-10-28T00:00:00.000Z",
    });
    expect(card.module).toBe("tasks");
    expect(card.reference).toBe("TSK-1");
    expect(card.summary).toMatch(/Priority: High/);
    expect(card.summary).toMatch(/Due: 2026-10-28/);
    expect(card.summary.length).toBeLessThanOrEqual(160);
  });

  it("trims record context under the hard character budget", () => {
    const cards = Array.from({ length: 20 }, (_, i) =>
      toListCard(
        taskCard({
          _id: `id-${i}`,
          reference: `TSK-${i}`,
          name: `Task number ${i} with a fairly long name for testing`,
          status: "Pending",
          priority: "High",
          dueDate: "2026-11-01T00:00:00.000Z",
        })
      )
    );
    const block = cardsToPromptBlock(cards, RECORD_CONTEXT_CHAR_BUDGET);
    expect(block.length).toBeLessThanOrEqual(RECORD_CONTEXT_CHAR_BUDGET + 50);
  });
});
