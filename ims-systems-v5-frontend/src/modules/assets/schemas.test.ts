import { describe, expect, it } from "vitest";
import {
  hardwareFormSchema,
  peopleFormSchema,
  softwareFormSchema,
} from "./schemas";

describe("assets form schemas", () => {
  it("requires hardware name and owner", () => {
    const result = hardwareFormSchema.safeParse({ name: "", ownerId: "" });
    expect(result.success).toBe(false);
  });

  it("accepts a valid hardware payload", () => {
    const result = hardwareFormSchema.safeParse({
      name: "Laptop",
      ownerId: "user-1",
      cost: "1200",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cost).toBe(1200);
    }
  });

  it("requires software name only", () => {
    expect(softwareFormSchema.safeParse({ name: "Slack" }).success).toBe(true);
    expect(softwareFormSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("requires people name, role, and skill", () => {
    expect(
      peopleFormSchema.safeParse({
        name: "Alex",
        role: "Analyst",
        skill: "Risk",
      }).success
    ).toBe(true);
    expect(
      peopleFormSchema.safeParse({
        name: "Alex",
        role: "Analyst",
      }).success
    ).toBe(false);
  });
});
