import { describe, expect, it } from "vitest";
import {
  createSupplierFormSchema,
  kpiObjectiveFormSchema,
  updateSupplierFormSchema,
} from "./schemas";

const validUnit = "cccccccccccccccccccccccc";
const validBuyer = "bbbbbbbbbbbbbbbbbbbbbbbb";

describe("createSupplierFormSchema", () => {
  it("requires core commercial fields", () => {
    const result = createSupplierFormSchema.safeParse({
      name: "",
      accountManager: "",
      accountNumber: "",
      email: "not-an-email",
      serviceProvision: "",
      contractValue: "",
      contractStartDate: "",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid register payload", () => {
    const result = createSupplierFormSchema.safeParse({
      name: "Acme Facilities Ltd",
      accountManager: "Jane Contact",
      accountNumber: "ACC-1001",
      email: "ops@acme.example",
      serviceProvision: "Facilities maintenance",
      contractValue: 25000,
      contractStartDate: "2026-01-15",
      businessUnitId: validUnit,
      buyerId: validBuyer,
      contractEndDate: "2027-01-15",
      reviewDate: "2026-06-01",
    });
    expect(result.success).toBe(true);
  });

  it("allows optional buyer and business unit", () => {
    const result = createSupplierFormSchema.safeParse({
      name: "Acme Facilities Ltd",
      accountManager: "Jane Contact",
      accountNumber: "ACC-1001",
      email: "ops@acme.example",
      serviceProvision: "Facilities maintenance",
      contractValue: 1000,
      contractStartDate: "2026-01-15",
      businessUnitId: "",
      buyerId: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.businessUnitId).toBeUndefined();
      expect(result.data.buyerId).toBeUndefined();
    }
  });
});

describe("updateSupplierFormSchema", () => {
  it("allows clearing buyer", () => {
    const result = updateSupplierFormSchema.safeParse({
      name: "Acme Facilities Ltd",
      accountManager: "Jane Contact",
      accountNumber: "ACC-1001",
      email: "ops@acme.example",
      serviceProvision: "Facilities maintenance",
      contractValue: 25000,
      contractStartDate: "2026-01-15",
      buyerId: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.buyerId).toBeNull();
    }
  });
});

describe("kpiObjectiveFormSchema", () => {
  it("requires a non-empty value", () => {
    expect(kpiObjectiveFormSchema.safeParse({ value: "" }).success).toBe(false);
    expect(
      kpiObjectiveFormSchema.safeParse({ value: "On-time delivery ≥ 95%" })
        .success
    ).toBe(true);
  });
});
