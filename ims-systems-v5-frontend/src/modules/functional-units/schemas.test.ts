import { describe, expect, it } from "vitest";
import { functionalUnitFormSchema } from "./schemas";

describe("functionalUnitFormSchema", () => {
  it("requires operating location for business types", () => {
    const result = functionalUnitFormSchema.safeParse({
      name: "Ops",
      accessType: "Internal business function",
      responsibility: "Do work",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid business unit payload", () => {
    const result = functionalUnitFormSchema.safeParse({
      name: "Ops",
      accessType: "Internal business function",
      responsibility: "Do work",
      operatingLocation: "London",
    });
    expect(result.success).toBe(true);
  });
});
