import { describe, expect, it } from "vitest";
import {
  addOfiActivityFormSchema,
  createOfiFormSchema,
  updateOfiFormSchema,
} from "./schemas";

const validOwner = "bbbbbbbbbbbbbbbbbbbbbbbb";
const validUnit = "cccccccccccccccccccccccc";

describe("createOfiFormSchema", () => {
  it("requires title, opportunity, owner, and business unit", () => {
    const result = createOfiFormSchema.safeParse({
      title: "",
      opportunityForImprovement: "",
      ownerId: "",
      businessUnitId: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid business unit id", () => {
    const result = createOfiFormSchema.safeParse({
      title: "Improve backup window",
      opportunityForImprovement: "Move backups off peak hours",
      ownerId: validOwner,
      businessUnitId: "not-an-object-id",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid raise payload", () => {
    const result = createOfiFormSchema.safeParse({
      title: "Improve backup window",
      opportunityForImprovement: "Move backups off peak hours",
      ownerId: validOwner,
      businessUnitId: validUnit,
      cost: 1200,
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty cost as optional", () => {
    const result = createOfiFormSchema.safeParse({
      title: "Improve backup window",
      opportunityForImprovement: "Move backups off peak hours",
      ownerId: validOwner,
      businessUnitId: validUnit,
      cost: "",
    });
    expect(result.success).toBe(true);
  });
});

describe("updateOfiFormSchema", () => {
  it("requires title and opportunity for improvement", () => {
    const result = updateOfiFormSchema.safeParse({
      title: "",
      opportunityForImprovement: "",
      ownerId: validOwner,
    });
    expect(result.success).toBe(false);
  });

  it("allows clearing owner", () => {
    const result = updateOfiFormSchema.safeParse({
      title: "Improve backup window",
      opportunityForImprovement: "Move backups off peak hours",
      ownerId: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ownerId).toBeNull();
    }
  });
});

describe("addOfiActivityFormSchema", () => {
  it("requires a non-empty message", () => {
    expect(addOfiActivityFormSchema.safeParse({ message: "" }).success).toBe(
      false
    );
    expect(
      addOfiActivityFormSchema.safeParse({ message: "Started investigation" })
        .success
    ).toBe(true);
  });
});
