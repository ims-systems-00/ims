import { describe, expect, it } from "vitest";
import { createRiskFormSchema, updateRiskFormSchema } from "./schemas";

const validOwner = "bbbbbbbbbbbbbbbbbbbbbbbb";

describe("createRiskFormSchema", () => {
  it("requires title, description, type, owner, and scores", () => {
    const result = createRiskFormSchema.safeParse({
      title: "",
      description: "",
      type: "Hardware",
      ownerId: "",
      likelihood: 1,
      consequence: 1,
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid raise payload", () => {
    const result = createRiskFormSchema.safeParse({
      title: "Unpatched server",
      description: "Missing security patches",
      type: "Hardware",
      ownerId: validOwner,
      likelihood: 3,
      consequence: 4,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.likelihood).toBe(3);
      expect(result.data.consequence).toBe(4);
    }
  });

  it("rejects scores outside 1–5", () => {
    const result = createRiskFormSchema.safeParse({
      title: "Risk",
      description: "Desc",
      type: "Software",
      ownerId: validOwner,
      likelihood: 9,
      consequence: 1,
    });
    expect(result.success).toBe(false);
  });
});

describe("updateRiskFormSchema", () => {
  it("allows clearing owner", () => {
    const result = updateRiskFormSchema.safeParse({
      title: "Risk",
      description: "Desc",
      type: "People",
      ownerId: "",
      likelihood: 2,
      consequence: 2,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ownerId).toBeNull();
    }
  });
});
