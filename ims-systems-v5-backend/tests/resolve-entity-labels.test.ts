import { describe, expect, it } from "vitest";
import {
  applyEntityLabels,
  buildRecordIdLabelMap,
  collectObjectIds,
  sanitizeAliceAnswer,
} from "../src/modules/ai/lib/resolve-entity-labels";
import type { AiContextCard } from "../src/modules/ai/types/chat";

describe("resolve-entity-labels helpers", () => {
  it("collects unique object ids", () => {
    expect(
      collectObjectIds(
        "Owner: 67e67ecc37058ba760b2b116",
        "Unit 67e67ecc37058ba760b2b116 and 67e6d018b34cd13031d6f682"
      )
    ).toEqual(["67e67ecc37058ba760b2b116", "67e6d018b34cd13031d6f682"]);
  });

  it("replaces ids in prose but keeps markdown link targets", () => {
    const labels = new Map([
      ["67e67ecc37058ba760b2b116", "Alex Owner"],
      ["67e6d018b34cd13031d6f682", "Operations"],
    ]);
    const input =
      "| Owner | Unit |\n| 67e67ecc37058ba760b2b116 | 67e6d018b34cd13031d6f682 |\n" +
      "[View](/tasks?task=67e67ecc37058ba760b2b116)";
    expect(applyEntityLabels(input, labels)).toBe(
      "| Owner | Unit |\n| Alex Owner | Operations |\n" +
        "[View](/tasks?task=67e67ecc37058ba760b2b116)"
    );
  });

  it("sanitizes record ids and bare ObjectId link labels", () => {
    const cards: AiContextCard[] = [
      {
        module: "risks",
        id: "67aaaaaaaaaaaaaaaaaaaaaa",
        reference: "RK-12",
        title: "Spill risk",
        status: "Open",
        summary: "Owner: Alex",
        href: "/risks?risk=67aaaaaaaaaaaaaaaaaaaaaa",
      },
    ];
    const recordLabels = buildRecordIdLabelMap(cards);
    const entityLabels = new Map([["67bbbbbbbbbbbbbbbbbbbbbb", "Zain"]]);
    const input =
      "| Ref | Raised by |\n| 67aaaaaaaaaaaaaaaaaaaaaa | 67bbbbbbbbbbbbbbbbbbbbbb |\n" +
      "[67aaaaaaaaaaaaaaaaaaaaaa](/risks?risk=67aaaaaaaaaaaaaaaaaaaaaa)\n" +
      "Owner 67cccccccccccccccccccccc";
    expect(sanitizeAliceAnswer(input, recordLabels, entityLabels)).toBe(
      "| Ref | Raised by |\n| RK-12 | Zain |\n" +
        "[RK-12](/risks?risk=67aaaaaaaaaaaaaaaaaaaaaa)\n" +
        "Owner Unknown user"
    );
  });

  it("keeps an explicit placeholder for unresolved owner cells", () => {
    const input =
      "| Ref | Owner |\n| RK-1 | 67dddddddddddddddddddddd |";
    expect(
      sanitizeAliceAnswer(input, new Map(), new Map())
    ).toBe("| Ref | Owner |\n| RK-1 | Unknown user |");
  });
});
