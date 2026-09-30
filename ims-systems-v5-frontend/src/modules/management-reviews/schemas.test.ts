import { describe, expect, it } from "vitest";
import {
  createManagementReviewFormSchema,
  updateManagementReviewFormSchema,
} from "./schemas";

const validUnit = "cccccccccccccccccccccccc";
const validUser = "bbbbbbbbbbbbbbbbbbbbbbbb";

describe("createManagementReviewFormSchema", () => {
  it("requires title, date, and interval", () => {
    const result = createManagementReviewFormSchema.safeParse({
      title: "",
      date: "",
      interval: "Yearly",
      privacy: "Organisational",
    });
    expect(result.success).toBe(false);
  });

  it("requires business unit for Business unit privacy", () => {
    const result = createManagementReviewFormSchema.safeParse({
      title: "Q1 leadership review",
      date: "2026-03-10",
      interval: "Quarterly",
      privacy: "Business unit",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid organisational schedule payload", () => {
    const result = createManagementReviewFormSchema.safeParse({
      title: "Q1 leadership review",
      date: "2026-03-10",
      interval: "Monthly",
      privacy: "Organisational",
      time: "10:00",
      attendees: [validUser],
    });
    expect(result.success).toBe(true);
  });

  it("accepts business unit privacy with a unit id", () => {
    const result = createManagementReviewFormSchema.safeParse({
      title: "BU quarterly review",
      date: "2026-03-10",
      interval: "Quarterly",
      privacy: "Business unit",
      businessUnitId: validUnit,
    });
    expect(result.success).toBe(true);
  });
});

describe("updateManagementReviewFormSchema", () => {
  it("accepts title, date, privacy, and attendees", () => {
    const result = updateManagementReviewFormSchema.safeParse({
      title: "Updated review",
      date: "2026-04-01",
      privacy: "Organisational",
      attendees: [validUser],
      time: "11:00",
    });
    expect(result.success).toBe(true);
  });
});
