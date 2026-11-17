import { describe, expect, it } from "vitest";
import {
  buildReminderMessage,
  computeRepoReviewDateOnOrAfter,
  getEffectiveReminderOffsets,
  getReviewDateTargetForOffset,
  utcDayRange,
} from "../src/modules/document-management/lib/document-review-reminder-offsets";

describe("document review reminder offsets", () => {
  it("always includes on_day plus selected advance offsets", () => {
    expect(getEffectiveReminderOffsets([])).toEqual(["on_day"]);
    expect(getEffectiveReminderOffsets(["1_week", "1_day", "nope"])).toEqual([
      "on_day",
      "1_week",
      "1_day",
    ]);
  });

  it("maps offsets to future review target days in UTC", () => {
    const run = new Date(Date.UTC(2026, 0, 10, 15, 30, 0));
    expect(getReviewDateTargetForOffset(run, "on_day")?.toISOString()).toBe(
      "2026-01-10T00:00:00.000Z"
    );
    expect(getReviewDateTargetForOffset(run, "1_week")?.toISOString()).toBe(
      "2026-01-17T00:00:00.000Z"
    );
    expect(getReviewDateTargetForOffset(run, "1_month")?.toISOString()).toBe(
      "2026-02-10T00:00:00.000Z"
    );
  });

  it("treats repository anniversary on the as-of day as due", () => {
    const createdOn = new Date(Date.UTC(2024, 0, 15));
    const asOf = new Date(Date.UTC(2026, 0, 15));
    const due = computeRepoReviewDateOnOrAfter(createdOn, "Yearly", asOf);
    expect(due?.toISOString()).toBe("2026-01-15T00:00:00.000Z");
  });

  it("builds on-day and advance reminder copy for each entity type", () => {
    expect(
      buildReminderMessage({
        entityType: "document",
        name: "Policy",
        reviewDateLabel: "15 Jan 2026",
        offset: "on_day",
      })
    ).toContain('Document "Policy" is due for review today');

    expect(
      buildReminderMessage({
        entityType: "folder",
        name: "HR",
        reviewDateLabel: "22 Jan 2026",
        offset: "1_week",
      })
    ).toContain("This is your 1 Week reminder");

    expect(
      buildReminderMessage({
        entityType: "repository",
        name: "Library",
        reviewDateLabel: "15 Jan 2026",
        offset: "on_day",
      })
    ).toContain('Repository "Library" is due for review today');
  });

  it("builds a UTC day range key", () => {
    expect(utcDayRange(new Date(Date.UTC(2026, 5, 1, 23))).key).toBe(
      "2026-06-01"
    );
  });
});
