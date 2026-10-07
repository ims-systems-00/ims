import { describe, expect, it } from "vitest";
import {
  createKpiObjectiveFormSchema,
  updateKpiObjectiveFormSchema,
} from "./schemas";

describe("createKpiObjectiveFormSchema", () => {
  it("accepts organisational KPI without business unit", () => {
    const result = createKpiObjectiveFormSchema.safeParse({
      value: "Maintain certification",
      privacy: "Organisational",
    });
    expect(result.success).toBe(true);
  });

  it("requires business unit for Business unit privacy", () => {
    const result = createKpiObjectiveFormSchema.safeParse({
      value: "Unit goal",
      privacy: "Business unit",
    });
    expect(result.success).toBe(false);
  });

  it("accepts business-unit KPI with valid id", () => {
    const result = createKpiObjectiveFormSchema.safeParse({
      value: "Unit goal",
      privacy: "Business unit",
      businessUnitId: "cccccccccccccccccccccccc",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty value", () => {
    const result = createKpiObjectiveFormSchema.safeParse({
      value: "   ",
      privacy: "Organisational",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateKpiObjectiveFormSchema", () => {
  it("requires non-empty value", () => {
    expect(
      updateKpiObjectiveFormSchema.safeParse({ value: "Updated" }).success
    ).toBe(true);
    expect(
      updateKpiObjectiveFormSchema.safeParse({ value: "" }).success
    ).toBe(false);
  });
});
