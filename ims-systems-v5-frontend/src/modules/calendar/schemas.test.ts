import { describe, expect, it } from "vitest";
import {
  createCalendarEventFormSchema,
  updateCalendarEventFormSchema,
} from "./schemas";

describe("calendar event form schemas", () => {
  it("accepts a valid create payload", () => {
    const parsed = createCalendarEventFormSchema.safeParse({
      title: "Team sync",
      start: new Date("2026-09-28T09:00:00.000Z"),
      end: new Date("2026-09-28T10:00:00.000Z"),
      description: "Weekly sync",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects missing title", () => {
    const parsed = createCalendarEventFormSchema.safeParse({
      title: "  ",
      start: new Date("2026-09-28T09:00:00.000Z"),
      end: new Date("2026-09-28T10:00:00.000Z"),
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects end before start", () => {
    const parsed = createCalendarEventFormSchema.safeParse({
      title: "Bad range",
      start: new Date("2026-09-28T12:00:00.000Z"),
      end: new Date("2026-09-28T10:00:00.000Z"),
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((i) => i.path[0] === "end")).toBe(true);
    }
  });

  it("rejects empty update payload", () => {
    const parsed = updateCalendarEventFormSchema.safeParse({});
    expect(parsed.success).toBe(false);
  });
});
