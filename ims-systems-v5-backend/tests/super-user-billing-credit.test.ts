import { describe, expect, it } from "vitest";
import {
  billableSuperUserQuantity,
  complimentarySuperUserSeats,
} from "../src/modules/payments/lib/super-user-billing-credit";

describe("super-user billing credit", () => {
  it("credits orgs whose officeEmail is robert.bowles@richfordgroup.com", () => {
    expect(
      complimentarySuperUserSeats({
        organizationId: "507f1f77bcf86cd799439011",
        officeEmail: "robert.bowles@richfordgroup.com",
      })
    ).toBe(1);

    expect(
      billableSuperUserQuantity(4, {
        organizationId: "507f1f77bcf86cd799439011",
        officeEmail: "Robert.Bowles@RichfordGroup.com",
      })
    ).toBe(3);
  });

  it("credits orgs whose officeEmail is jim@imssystems.tech", () => {
    expect(
      billableSuperUserQuantity(4, {
        organizationId: "507f1f77bcf86cd799439022",
        officeEmail: "jim@imssystems.tech",
      })
    ).toBe(3);
  });

  it("honours STRIPE_SA_COMPLIMENTARY_ORG_IDS", () => {
    const orgId = "507f1f77bcf86cd799439099";
    expect(
      billableSuperUserQuantity(2, {
        organizationId: orgId,
        officeEmail: "other@example.com",
        complimentaryOrgIdsFromEnv: `${orgId}, aabb`,
      })
    ).toBe(1);
  });

  it("does not credit unrelated office emails", () => {
    expect(
      billableSuperUserQuantity(4, {
        organizationId: "507f1f77bcf86cd799439011",
        officeEmail: "ops@demo.local",
      })
    ).toBe(4);
  });

  it("never bills a negative Super Admin quantity", () => {
    expect(
      billableSuperUserQuantity(0, {
        organizationId: "507f1f77bcf86cd799439011",
        officeEmail: "robert.bowles@richfordgroup.com",
      })
    ).toBe(0);
  });
});
