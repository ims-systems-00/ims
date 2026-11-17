import { describe, expect, it } from "vitest";
import {
  computeRepoReviewDate,
  formatReviewDateDisplay,
  fromDateInputValue,
  toDateInputValue,
} from "@/modules/document-management/lib/format";

describe("document review date helpers", () => {
  it("formats empty review dates as Not set", () => {
    expect(formatReviewDateDisplay(null)).toBe("Not set");
    expect(formatReviewDateDisplay(undefined)).toBe("Not set");
  });

  it("formats review dates as dd Month yyyy", () => {
    expect(formatReviewDateDisplay("2027-01-12T00:00:00.000Z")).toBe(
      "12 January 2027"
    );
  });

  it("round-trips native date-picker values to ISO", () => {
    expect(toDateInputValue("2026-06-15T00:00:00.000Z")).toBe("2026-06-15");
    expect(fromDateInputValue("2026-06-15")).toBe("2026-06-15T00:00:00.000Z");
    expect(fromDateInputValue("15/06/2026")).toBe("2026-06-15T00:00:00.000Z");
    expect(fromDateInputValue("")).toBeNull();
    expect(fromDateInputValue("2026-13-01")).toBeNull();
  });

  it("advances repo review date past today from an old createdOn", () => {
    const next = computeRepoReviewDate("2020-01-15T00:00:00.000Z", "Yearly");
    expect(next).not.toBeNull();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expect(next!.getTime()).toBeGreaterThan(today.getTime());
  });
});
