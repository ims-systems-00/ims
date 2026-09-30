import { describe, expect, it } from "vitest";
import {
  createIncidentFormSchema,
  updateIncidentFormSchema,
} from "./schemas";

const validOwner = "bbbbbbbbbbbbbbbbbbbbbbbb";
const validUnit = "cccccccccccccccccccccccc";

describe("createIncidentFormSchema", () => {
  it("requires title (≥8), description, unit, owner, and priority", () => {
    const result = createIncidentFormSchema.safeParse({
      title: "Short",
      description: "",
      businessUnitId: "",
      priority: "P1",
      ownerId: "",
      privacy: "Business unit",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid raise payload", () => {
    const result = createIncidentFormSchema.safeParse({
      title: "Server room water leak",
      description: "Water under cooling unit",
      businessUnitId: validUnit,
      priority: "P2",
      ownerId: validOwner,
      privacy: "Business unit",
    });
    expect(result.success).toBe(true);
  });
});

describe("updateIncidentFormSchema", () => {
  it("requires resolution text when marking resolved", () => {
    const result = updateIncidentFormSchema.safeParse({
      title: "Server room water leak",
      description: "Water under cooling unit",
      ownerId: validOwner,
      priority: "P2",
      privacy: "Business unit",
      resolved: true,
      resolution: "",
    });
    expect(result.success).toBe(false);
  });

  it("accepts resolve with resolution text", () => {
    const result = updateIncidentFormSchema.safeParse({
      title: "Server room water leak",
      description: "Water under cooling unit",
      ownerId: validOwner,
      priority: "P2",
      privacy: "Business unit",
      resolved: true,
      resolution: "Leak contained",
    });
    expect(result.success).toBe(true);
  });
});
