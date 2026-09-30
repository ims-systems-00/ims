import { describe, expect, it } from "vitest";
import { businessPremiseFormSchema } from "./schemas";

describe("businessPremiseFormSchema", () => {
  it("accepts a valid premise payload", () => {
    const parsed = businessPremiseFormSchema.safeParse({
      name: "Head Office",
      location: "Manchester",
      address: "1 Market Street",
      functionalUnitIds: ["cccccccccccccccccccccccc"],
    });
    expect(parsed.success).toBe(true);
  });

  it("requires name, location, address, and at least one unit", () => {
    const parsed = businessPremiseFormSchema.safeParse({
      name: " ",
      location: "",
      address: "",
      functionalUnitIds: [],
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const paths = parsed.error.issues.map((issue) => issue.path[0]);
      expect(paths).toContain("name");
      expect(paths).toContain("location");
      expect(paths).toContain("address");
      expect(paths).toContain("functionalUnitIds");
    }
  });

  it("rejects invalid Functional Unit ids", () => {
    const parsed = businessPremiseFormSchema.safeParse({
      name: "Head Office",
      location: "Manchester",
      address: "1 Market Street",
      functionalUnitIds: ["not-an-id"],
    });
    expect(parsed.success).toBe(false);
  });
});
