import { describe, expect, it } from "vitest";
import {
  createControlEvidenceSchema,
  updateControlStatusSchema,
} from "@/modules/compliance/schemas";

describe("compliance schemas", () => {
  it("rejects implemented when control is not selected", () => {
    const parsed = updateControlStatusSchema.safeParse({
      selected: "Not selected",
      state: "Implemented",
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts selected + implemented", () => {
    const parsed = updateControlStatusSchema.safeParse({
      selected: "Selected",
      state: "Implemented",
    });
    expect(parsed.success).toBe(true);
  });

  it("requires related risk for risk-management evidence", () => {
    const parsed = createControlEvidenceSchema.safeParse({
      evidenceType: "risk-management",
    });
    expect(parsed.success).toBe(false);
  });

  it("blocks document-management until Documents module exists", () => {
    const parsed = createControlEvidenceSchema.safeParse({
      evidenceType: "document-management",
      relatedDocumentId: "aaaaaaaaaaaaaaaaaaaaaaaa",
    });
    expect(parsed.success).toBe(false);
  });
});
