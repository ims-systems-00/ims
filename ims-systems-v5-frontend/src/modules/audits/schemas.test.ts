import { describe, expect, it } from "vitest";
import {
  createAuditFormSchema,
  embeddedRiskFormSchema,
  identificationFormSchema,
  updateAuditFormSchema,
} from "./schemas";

const validUnit = "cccccccccccccccccccccccc";
const validAuditor = "bbbbbbbbbbbbbbbbbbbbbbbb";

describe("createAuditFormSchema", () => {
  it("requires title, focus area, auditor, units, date, interval, and type", () => {
    const result = createAuditFormSchema.safeParse({
      title: "",
      focusArea: "",
      auditorId: "",
      businessUnitId: "",
      complianceBodyId: "",
      startDate: "",
      interval: "Yearly",
      type: "Internal",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid schedule payload", () => {
    const result = createAuditFormSchema.safeParse({
      title: "ISO 27001 internal review",
      focusArea: "Access control",
      auditorId: validAuditor,
      businessUnitId: validUnit,
      complianceBodyId: validUnit,
      startDate: "2026-03-10",
      interval: "Quarterly",
      type: "Internal",
      time: "09:00",
    });
    expect(result.success).toBe(true);
  });
});

describe("updateAuditFormSchema", () => {
  it("accepts summary comment updates", () => {
    const result = updateAuditFormSchema.safeParse({
      title: "ISO 27001 internal review",
      focusArea: "Access control",
      businessUnitId: validUnit,
      complianceBodyId: validUnit,
      startDate: "2026-03-10",
      comment: "Closing notes",
    });
    expect(result.success).toBe(true);
  });
});

describe("finding schemas", () => {
  it("requires non-conformity and root cause", () => {
    expect(
      identificationFormSchema.safeParse({
        nonConformity: "",
        rootCause: "",
      }).success
    ).toBe(false);
  });

  it("validates embedded risk scores 1–5", () => {
    expect(
      embeddedRiskFormSchema.safeParse({
        title: "Weak MFA",
        description: "No MFA",
        likelihood: 6,
        consequence: 3,
      }).success
    ).toBe(false);
    expect(
      embeddedRiskFormSchema.safeParse({
        title: "Weak MFA",
        description: "No MFA",
        likelihood: 3,
        consequence: 4,
      }).success
    ).toBe(true);
  });
});
