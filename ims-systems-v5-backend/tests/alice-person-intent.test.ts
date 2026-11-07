import { describe, expect, it } from "vitest";
import {
  emptyRetryTool,
  resolveForcedTool,
} from "../src/modules/ai/lib/forced-tools";
import { routeChatIntent } from "../src/modules/ai/lib/intent-router";
import { personNameFromMessage } from "../src/modules/ai/lib/resolve-directory";
import { riskCard } from "../src/modules/ai/lib/context-cards";
import { listRisksArgsSchema } from "../src/modules/ai/tools/schemas";

describe("Alice person-qualified intents", () => {
  it("parses raised-by names from messages", () => {
    expect(personNameFromMessage("any risks raised by Zain?")).toEqual({
      role: "raisedBy",
      name: "Zain",
    });
  });

  it("routes raised-by questions to risks list filters", () => {
    const intent = routeChatIntent({
      message: "any risks raised by Zain?",
    });
    expect(intent.primaryModule).toBe("risks");
    expect(intent.mode).toBe("list");
    expect(intent.filters.personRole).toBe("raisedBy");
    expect(intent.filters.personName).toBe("Zain");
  });

  it("forces list_risks with raisedByName", () => {
    const intent = routeChatIntent({
      message: "any risks raised by Zain?",
    });
    const forced = resolveForcedTool("any risks raised by Zain?", intent);
    expect(forced).toEqual({
      name: "list_risks",
      args: { raisedByName: "Zain", includeClosed: true, limit: 8 },
      analyticsKind: "person_filter",
    });
  });

  it("routes owned-by to ownerName", () => {
    const prompt = "any risks owned by Alex?";
    const intent = routeChatIntent({ message: prompt });
    expect(intent.filters.personRole).toBe("owner");
    expect(intent.filters.personName).toBe("Alex");
    expect(resolveForcedTool(prompt, intent)).toEqual({
      name: "list_risks",
      args: { ownerName: "Alex", includeClosed: true, limit: 8 },
      analyticsKind: "person_filter",
    });
  });

  it("routes vague involvement to personName (multi-role)", () => {
    const prompt = "risks by Sam";
    const intent = routeChatIntent({ message: prompt });
    expect(intent.filters.personRole).toBe("involved");
    expect(intent.filters.personName).toBe("Sam");
    expect(resolveForcedTool(prompt, intent)).toEqual({
      name: "list_risks",
      args: { personName: "Sam", includeClosed: true, limit: 8 },
      analyticsKind: "person_filter",
    });
  });

  it("routes possessive person risks to multi-role involvement", () => {
    const prompt = "Show Sam's risks";
    const intent = routeChatIntent({ message: prompt });
    expect(intent.filters.personRole).toBe("involved");
    expect(intent.filters.personName).toBe("Sam");
  });

  it("empty-retry broadens precise person filters to multi-role involvement", () => {
    const intent = routeChatIntent({
      message: "any risks raised by Zain?",
    });
    const forced = resolveForcedTool("any risks raised by Zain?", intent);
    const broaden = emptyRetryTool(forced, intent);
    expect(broaden).toEqual({
      name: "list_risks",
      args: { personName: "Zain", includeClosed: true, limit: 8 },
      analyticsKind: "person_filter",
    });
    expect(emptyRetryTool(broaden, intent)).toBeNull();
  });

  it("accepts personName on list_risks schema", () => {
    expect(
      listRisksArgsSchema.parse({ personName: "Sam", includeClosed: true })
        .personName
    ).toBe("Sam");
  });

  it("risk cards expose joined owner/raisedBy/unit slots", () => {
    const card = riskCard({
      _id: "67aaaaaaaaaaaaaaaaaaaaaa",
      reference: "RK-12",
      title: "Spill",
      raisedBy: "67bbbbbbbbbbbbbbbbbbbbbb",
      ownerId: "67cccccccccccccccccccccc",
      businessUnitId: "67dddddddddddddddddddddd",
      raisedOn: "2026-01-02T00:00:00.000Z",
    });
    expect(card.raisedBy).toEqual({
      id: "67bbbbbbbbbbbbbbbbbbbbbb",
      name: "67bbbbbbbbbbbbbbbbbbbbbb",
    });
    expect(card.owner).toEqual({
      id: "67cccccccccccccccccccccc",
      name: "67cccccccccccccccccccccc",
    });
    expect(card.functionalUnit).toEqual({
      id: "67dddddddddddddddddddddd",
      name: "67dddddddddddddddddddddd",
    });
    expect(card.summary).toMatch(/Owner:/);
    expect(card.summary).toMatch(/Raised by:/);
  });
});
