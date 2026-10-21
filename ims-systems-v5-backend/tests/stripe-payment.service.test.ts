import { describe, expect, it, vi } from "vitest";
import { createStripePaymentService } from "../src/modules/payments/services/stripe-payment.service";
import type { Organisation } from "../src/modules/organisation/types";
import { ValidationAppError } from "../src/shared";

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
      stripeCustomerId: "cus_test",
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

describe("stripe payment service", () => {
  it("creates a checkout session for a Card org", async () => {
    const org = makeOrg();
    const organisations = {
      findById: vi.fn(async () => org),
      updatePaymentSystem: vi.fn(),
      findByStripeSubscriptionId: vi.fn(),
      markSubscribedByStripeCustomerId: vi.fn(),
      markUnsubscribedByStripeCustomerId: vi.fn(),
      resetPaymentSystemByStripeCustomerId: vi.fn(),
    };
    const stripe = {
      customers: { create: vi.fn() },
      prices: {
        retrieve: vi.fn(async () => ({ unit_amount: 1000 })),
      },
      checkout: {
        sessions: {
          create: vi.fn(async () => ({
            id: "cs_test",
            url: "https://checkout.stripe.test/session",
          })),
        },
      },
      billingPortal: { sessions: { create: vi.fn() } },
      webhooks: { constructEvent: vi.fn() },
      subscriptionItems: { list: vi.fn(), update: vi.fn() },
      invoiceItems: { create: vi.fn() },
    };
    const service = createStripePaymentService({
      stripe: stripe as never,
      config: {
        STRIPE_BU_PRICE: "price_bu",
        STRIPE_SA_PRICE: "price_sa",
        STRIPE_USER_PRICE: "price_user",
        STRIPE_COMPLIANCE_PRICE: "price_comp",
        STRIPE_ADD_MODULE_PRICE: "price_mod",
        STRIPE_SUPPORT_PRICE: "price_support",
        STRIPE_WEBHOOK_SECRET: "whsec_test",
        CLIENT_URL: "http://localhost:3000/",
      } as never,
      organisations: organisations as never,
    });

    const session = await service.createCheckoutSessionForOrg({
      organizationId: org.id,
      licences: {
        groups: 3,
        users: 5,
        superUser: 2,
        complianceTools: ["ISO 27001"],
        additionalModules: [],
        includeToolkitsAndModules: true,
      },
    });

    expect(session.url).toBe("https://checkout.stripe.test/session");
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "subscription",
        customer: "cus_test",
        success_url: "http://localhost:3000/auth/preparation-screen",
      })
    );
    const lineItems = stripe.checkout.sessions.create.mock.calls[0]![0]
      .line_items as Array<{ price: string; quantity: number }>;
    expect(lineItems.map((row) => row.price)).toEqual([
      "price_bu",
      "price_sa",
      "price_user",
      "price_comp",
      "price_support",
    ]);
  });

  it("rejects invalid webhook signatures", async () => {
    const organisations = {
      findById: vi.fn(),
      updatePaymentSystem: vi.fn(),
      findByStripeSubscriptionId: vi.fn(),
      markSubscribedByStripeCustomerId: vi.fn(),
      markUnsubscribedByStripeCustomerId: vi.fn(),
      resetPaymentSystemByStripeCustomerId: vi.fn(),
    };
    const stripe = {
      customers: { create: vi.fn() },
      prices: { retrieve: vi.fn() },
      checkout: { sessions: { create: vi.fn() } },
      billingPortal: { sessions: { create: vi.fn() } },
      webhooks: {
        constructEvent: vi.fn(() => {
          throw new Error("bad sig");
        }),
      },
      subscriptionItems: { list: vi.fn(), update: vi.fn() },
      invoiceItems: { create: vi.fn() },
    };
    const service = createStripePaymentService({
      stripe: stripe as never,
      config: {
        STRIPE_WEBHOOK_SECRET: "whsec_test",
        CLIENT_URL: "http://localhost:3000",
      } as never,
      organisations: organisations as never,
    });

    await expect(
      service.handleWebhookEvent(Buffer.from("{}"), "sig")
    ).rejects.toBeInstanceOf(ValidationAppError);
  });

  it("marks org subscribed on customer.subscription.updated", async () => {
    const markSubscribedByStripeCustomerId = vi.fn(async () => makeOrg());
    const organisations = {
      findById: vi.fn(),
      updatePaymentSystem: vi.fn(),
      findByStripeSubscriptionId: vi.fn(),
      markSubscribedByStripeCustomerId,
      markUnsubscribedByStripeCustomerId: vi.fn(),
      resetPaymentSystemByStripeCustomerId: vi.fn(),
    };
    const stripe = {
      customers: { create: vi.fn() },
      prices: { retrieve: vi.fn() },
      checkout: { sessions: { create: vi.fn() } },
      billingPortal: { sessions: { create: vi.fn() } },
      webhooks: {
        constructEvent: vi.fn(() => ({
          type: "customer.subscription.updated",
          data: {
            object: { id: "sub_1", customer: "cus_1" },
          },
        })),
      },
      subscriptionItems: { list: vi.fn(), update: vi.fn() },
      invoiceItems: { create: vi.fn() },
    };
    const service = createStripePaymentService({
      stripe: stripe as never,
      config: {
        STRIPE_WEBHOOK_SECRET: "whsec_test",
        CLIENT_URL: "http://localhost:3000",
      } as never,
      organisations: organisations as never,
    });

    await service.handleWebhookEvent(Buffer.from("{}"), "sig");
    expect(markSubscribedByStripeCustomerId).toHaveBeenCalledWith(
      "cus_1",
      "sub_1"
    );
  });

  it("upgrades subscription quantities and invoice items", async () => {
    const org = makeOrg({
      paymentSystem: {
        type: "Card",
        status: "Subscribed",
        stripeCustomerId: "cus_test",
        stripeSubscriptionId: "sub_test",
      },
    });
    const organisations = {
      findById: vi.fn(),
      updatePaymentSystem: vi.fn(),
      findByStripeSubscriptionId: vi.fn(async () => org),
      markSubscribedByStripeCustomerId: vi.fn(),
      markUnsubscribedByStripeCustomerId: vi.fn(),
      resetPaymentSystemByStripeCustomerId: vi.fn(),
    };
    const subscriptionItemsUpdate = vi.fn(async () => ({}));
    const invoiceItemsCreate = vi.fn(async () => ({}));
    const stripe = {
      customers: { create: vi.fn() },
      prices: { retrieve: vi.fn() },
      checkout: { sessions: { create: vi.fn() } },
      billingPortal: { sessions: { create: vi.fn() } },
      webhooks: { constructEvent: vi.fn() },
      subscriptionItems: {
        list: vi.fn(async () => ({
          data: [
            { id: "si_bu", quantity: 3, price: { id: "price_bu", unit_amount: 1000 } },
            { id: "si_sa", quantity: 2, price: { id: "price_sa", unit_amount: 2000 } },
            { id: "si_u", quantity: 5, price: { id: "price_user", unit_amount: 500 } },
            {
              id: "si_support",
              quantity: 2,
              price: { id: "price_support", unit_amount: 100 },
            },
          ],
        })),
        update: subscriptionItemsUpdate,
      },
      invoiceItems: { create: invoiceItemsCreate },
    };
    const service = createStripePaymentService({
      stripe: stripe as never,
      config: {
        STRIPE_BU_PRICE: "price_bu",
        STRIPE_SA_PRICE: "price_sa",
        STRIPE_USER_PRICE: "price_user",
        STRIPE_COMPLIANCE_PRICE: "price_comp",
        STRIPE_ADD_MODULE_PRICE: "price_mod",
        STRIPE_SUPPORT_PRICE: "price_support",
        STRIPE_WEBHOOK_SECRET: "whsec_test",
        CLIENT_URL: "http://localhost:3000",
      } as never,
      organisations: organisations as never,
    });

    await service.upgradeSubscription("sub_test", {
      groups: 1,
      users: 0,
      superUser: 0,
      complianceTools: ["ISO 9001"],
      additionalModules: [],
    });

    expect(subscriptionItemsUpdate).toHaveBeenCalledWith("si_bu", {
      quantity: 4,
    });
    expect(invoiceItemsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: "cus_test",
        subscription: "sub_test",
        pricing: { price: "price_comp" },
        quantity: 1,
      })
    );
  });
});
