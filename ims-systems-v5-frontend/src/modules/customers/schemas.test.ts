import { describe, expect, it } from "vitest";
import {
  createCustomerFormSchema,
  updateCustomerFormSchema,
} from "./schemas";

describe("createCustomerFormSchema", () => {
  it("requires name and primary email", () => {
    const result = createCustomerFormSchema.safeParse({
      name: "",
      primaryEmail: "not-an-email",
      contractValue: 0,
    });
    expect(result.success).toBe(false);
  });

  it("accepts a prospect payload", () => {
    const result = createCustomerFormSchema.safeParse({
      name: "Acme Care Ltd",
      primaryEmail: "hello@acme.example",
      stage: "Prospect",
      status: "Open",
      probability: 20,
      contractValue: 5000,
      accountManager: "bbbbbbbbbbbbbbbbbbbbbbbb",
      businessUnitId: "cccccccccccccccccccccccc",
    });
    expect(result.success).toBe(true);
  });

  it("requires contract dates for Live", () => {
    const result = createCustomerFormSchema.safeParse({
      name: "Acme Care Ltd",
      primaryEmail: "hello@acme.example",
      stage: "Live",
      contractValue: 5000,
    });
    expect(result.success).toBe(false);
  });

  it("requires reason for Lost", () => {
    const result = createCustomerFormSchema.safeParse({
      name: "Acme Care Ltd",
      primaryEmail: "hello@acme.example",
      status: "Lost",
      contractValue: 0,
    });
    expect(result.success).toBe(false);
  });
});

describe("updateCustomerFormSchema", () => {
  it("allows clearing account manager", () => {
    const result = updateCustomerFormSchema.safeParse({
      name: "Acme Care Ltd",
      primaryEmail: "hello@acme.example",
      stage: "Prospect",
      status: "Open",
      probability: 10,
      contractValue: 1000,
      accountManager: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.accountManager).toBeNull();
    }
  });
});
