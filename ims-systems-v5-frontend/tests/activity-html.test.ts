import { describe, expect, it } from "vitest";
import {
  isActivityValueEmpty,
  normalizeActivityHtml,
} from "../src/modules/activities/lib/activity-html";

describe("activity html helpers", () => {
  it("treats empty paragraphs as empty", () => {
    expect(isActivityValueEmpty("")).toBe(true);
    expect(isActivityValueEmpty("<p></p>")).toBe(true);
    expect(isActivityValueEmpty("<p><br></p>")).toBe(true);
  });

  it("keeps text and media as non-empty", () => {
    expect(isActivityValueEmpty("hello")).toBe(false);
    expect(isActivityValueEmpty("<p>hello</p>")).toBe(false);
    expect(
      isActivityValueEmpty(
        '<p></p><img data-bucket="b" data-key="k" src="x" />'
      )
    ).toBe(false);
  });

  it("normalizes plain text and Draft.js raw", () => {
    expect(normalizeActivityHtml("line1\nline2")).toContain("line1");
    const draft = JSON.stringify({
      blocks: [{ text: "from draft" }, { text: "second" }],
      entityMap: {},
    });
    expect(normalizeActivityHtml(draft)).toContain("from draft");
  });
});
