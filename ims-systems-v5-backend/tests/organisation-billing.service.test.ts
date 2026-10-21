import { describe, expect, it, vi } from "vitest";
import { createOrganisationService } from "../src/modules/organisation/services/organisation.service";
import type { Organisation } from "../src/modules/organisation/types";
import type { SecurityIdentity } from "../src/security";
import { ConflictError, ValidationAppError } from "../src/shared";

function identity(): SecurityIdentity {
  return {
    subjectId: "user-1",
    organizationId: "507f1f77bcf86cd799439011",
  } as SecurityIdentity;
}

function makeOrg(overrides: Partial<Organisation> = {}): Organisation {
  const now = new Date();
  return {
    id: "507f1f77bcf86cd799439011",
    reference: "ORG-TEST",
    name: "Acme",
    industry: "IT",
    sizeOfOrganisation: 10,
    officeEmail: "ops@acme.test",
    contactNumber: "+44 20 0000 0000",
    companyNumber: "",
    vatNumber: "",
    address: {
      line1: "1 High St",
      line2: "",
      city: "London",
      county: "Greater London",
      postCode: "EC1A 1BB",
      country: "United Kingdom",
    },
    country: {
      name: "United Kingdom",
      code: "GB",
      currency: "GBP",
      phoneCode: 44,
    },
    isCustomer: true,
    isPartner: false,
    status: "Running",
    licences: {
      superUser: { allocated: 2, used: 1 },
      users: { allocated: 5, used: 2 },
      groups: { allocated: 3, used: 1 },
      complianceTools: ["ISO 27001"],
      additionalModules: [],
      carbocalc: false,
      imsforms: false,
      projectims: false,
    },
    paymentSystem: {
      type: "Card",
      status: "Trial",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
    },
    systemDate: { start: now, end: now, unset: false },
    documentReviewReminderOffsets: [],
    referralSource: null,
    logoSrc: null,
    auth0OrganizationId: null,
    createdBy: "user-1",
    createdOn: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("organisation billing service", () => {
  it("creates a card payment session when Stripe is wired", async () => {
    const org = makeOrg();
    const organisations = {
      findById: vi.fn(async () => org),
      updatePaymentSystem: vi.fn(async () => org),
      applyLicenceRequest: vi.fn(),
    };
    const memberships = {
      findByUserAndOrg: vi.fn(async () => ({
        id: "m1",
        organizationId: org.id,
        userId: "user-1",
        role: "Super Admin",
      })),
    };
    const billing = {
      createCheckoutSessionForOrg: vi.fn(async () => ({
        url: "https://checkout.stripe.test/session",
        id: "cs_1",
      })),
      createBillingPortalSession: vi.fn(),
      upgradeSubscription: vi.fn(),
    };
    const service = createOrganisationService({
      organisations: organisations as never,
      memberships: memberships as never,
      authorizer: { allow: vi.fn(async () => true) } as never,
      billing,
    });

    const session = await service.createCardPaymentSession(
      identity(),
      org.id
    );
    expect(session.url).toContain("checkout.stripe.test");
    expect(organisations.updatePaymentSystem).toHaveBeenCalledWith(org.id, {
      type: "Card",
    });
    expect(billing.createCheckoutSessionForOrg).toHaveBeenCalled();
  });

  it("rejects card payment when subscription already exists", async () => {
    const org = makeOrg({
      paymentSystem: {
        type: "Card",
        status: "Subscribed",
        stripeCustomerId: "cus_1",
        stripeSubscriptionId: "sub_1",
      },
    });
    const service = createOrganisationService({
      organisations: {
        findById: vi.fn(async () => org),
      } as never,
      memberships: {
        findByUserAndOrg: vi.fn(async () => ({
          role: "Super Admin",
        })),
      } as never,
      authorizer: { allow: vi.fn(async () => true) } as never,
      billing: {
        createCheckoutSessionForOrg: vi.fn(),
        createBillingPortalSession: vi.fn(),
        upgradeSubscription: vi.fn(),
      },
    });

    await expect(
      service.createCardPaymentSession(identity(), org.id)
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("upgrades Stripe after licence request when subscribed", async () => {
    const org = makeOrg({
      paymentSystem: {
        type: "Card",
        status: "Subscribed",
        stripeCustomerId: "cus_1",
        stripeSubscriptionId: "sub_1",
      },
    });
    const updated = makeOrg({
      ...org,
      licences: {
        ...org.licences,
        users: { allocated: 7, used: 2 },
      },
    });
    const upgradeSubscription = vi.fn(async () => undefined);
    const service = createOrganisationService({
      organisations: {
        findById: vi.fn(async () => org),
        applyLicenceRequest: vi.fn(async () => updated),
      } as never,
      memberships: {
        findByUserAndOrg: vi.fn(async () => ({
          role: "Super Admin",
        })),
      } as never,
      authorizer: { allow: vi.fn(async () => true) } as never,
      billing: {
        createCheckoutSessionForOrg: vi.fn(),
        createBillingPortalSession: vi.fn(),
        upgradeSubscription,
      },
    });

    await service.requestLicence(identity(), { users: 2 });
    expect(upgradeSubscription).toHaveBeenCalledWith("sub_1", {
      superUser: 0,
      users: 2,
      groups: 0,
      complianceTools: [],
      additionalModules: [],
    });
  });

  it("errors when billing routes are hit without Stripe", async () => {
    const org = makeOrg({
      paymentSystem: {
        type: "Card",
        status: "Trial",
        stripeCustomerId: "cus_1",
        stripeSubscriptionId: null,
      },
    });
    const service = createOrganisationService({
      organisations: {
        findById: vi.fn(async () => org),
        updatePaymentSystem: vi.fn(async () => org),
      } as never,
      memberships: {
        findByUserAndOrg: vi.fn(async () => ({
          role: "Super Admin",
        })),
      } as never,
      authorizer: { allow: vi.fn(async () => true) } as never,
    });

    await expect(
      service.createCardPaymentSession(identity(), org.id)
    ).rejects.toBeInstanceOf(ValidationAppError);
  });

  it("resumes Card Go Live checkout when org is already customer in Trial", async () => {
    const org = makeOrg({
      isCustomer: true,
      paymentSystem: {
        type: "Card",
        status: "Trial",
        stripeCustomerId: "cus_1",
        stripeSubscriptionId: null,
      },
    });
    const createCardCheckoutSession = vi.fn(async () => ({
      url: "https://checkout.stripe.test/resume",
    }));
    const service = createOrganisationService({
      organisations: {
        findById: vi.fn(async () => org),
        updatePaymentSystem: vi.fn(async () => org),
        applyGoLive: vi.fn(),
      } as never,
      memberships: {
        findByUserAndOrg: vi.fn(async () => ({
          role: "Super Admin",
        })),
      } as never,
      authorizer: { allow: vi.fn(async () => true) } as never,
      goLiveSideEffects: {
        provisionComplianceToolkits: vi.fn(async () => undefined),
        createCardCheckoutSession,
        notifyGoLive: vi.fn(async () => undefined),
      },
    });

    const result = await service.goLive(identity(), org.id, {
      paymentType: "Card",
      superUser: 2,
      users: 5,
      groups: 3,
    });

    expect(createCardCheckoutSession).toHaveBeenCalledWith({
      organizationId: org.id,
      actorId: "user-1",
    });
    expect(result.paymentSession?.url).toContain("checkout.stripe.test");
    expect(result.organisation.id).toBe(org.id);
  });
});
