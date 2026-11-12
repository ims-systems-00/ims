import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getFlatTour, listShippedTours } from "@/modules/setup-guide/catalog";
import { flattenTour } from "@/modules/setup-guide/lib/flatten-tour";

const SRC_ROOT = join(__dirname, "..", "src");

/** Files that host Organisation tour `data-tour` hooks. */
const HOOK_SOURCES = [
  "modules/functional-units/pages/functional-units-list-page.tsx",
  "modules/functional-units/components/functional-unit-form.tsx",
  "modules/users/pages/users-list-page.tsx",
  "modules/invitations/components/invite-user-dialog.tsx",
  "modules/business-premise/pages/business-premises-list-page.tsx",
  "modules/business-premise/components/business-premise-form.tsx",
];

function extractTourAttr(selector: string): string | null {
  const match = /data-tour=['"]([^'"]+)['"]/.exec(selector);
  return match?.[1] ?? null;
}

describe("Setup Guide tours", () => {
  it("flattens Organisation into chapter → points → outro", () => {
    const flat = getFlatTour("organisation");
    expect(flat).toBeTruthy();
    expect(flat!.chapters.map((c) => c.name)).toEqual([
      "Business units",
      "Users",
      "Premises",
    ]);
    expect(flat!.steps[0]?.kind).toBe("chapter");
    expect(flat!.steps.at(-1)?.kind).toBe("outro");
    expect(flat!.steps.some((s) => s.kind === "action")).toBe(true);
    // Re-flatten must stay stable / throw on authoring mistakes
    expect(() => flattenTour(flat!.tour)).not.toThrow();
  });

  it("ships only Organisation for now; others stay coming soon", () => {
    expect(listShippedTours().map((t) => t.id)).toEqual(["organisation"]);
  });

  it("has a matching data-tour hook in the app for every Organisation point", () => {
    const flat = getFlatTour("organisation");
    expect(flat).toBeTruthy();

    const sources = HOOK_SOURCES.map((relative) =>
      readFileSync(join(SRC_ROOT, relative), "utf8")
    ).join("\n");

    const missing: string[] = [];
    for (const step of flat!.steps) {
      if (!step.target) continue;
      const attr = extractTourAttr(step.target);
      if (!attr) {
        missing.push(`${step.id}: bad selector ${step.target}`);
        continue;
      }
      if (!sources.includes(`data-tour="${attr}"`) && !sources.includes(`dataTour="${attr}"`)) {
        missing.push(`${step.id}: missing data-tour="${attr}"`);
      }
    }
    expect(missing).toEqual([]);
  });
});
