/**
 * Stripe Checkout / Portal / webhook / subscription upgrade.
 * Spec: docs/module-specifications/stripe-payments.md
 */

import type { AppConfig } from "../../../config";
import type { Logger } from "../../../infrastructure/logging/logger";
import type { Stripe } from "../../../infrastructure/stripe/create-stripe-client";
import {
  ConflictError,
  NotFoundError,
  ValidationAppError,
} from "../../../shared";
import type { OrganisationRepository } from "../../organisation/repositories/organisation.repository";
import type {
  CheckoutSessionResult,
  StripeCheckoutLicences,
  StripeLicenceDelta,
} from "../types";

const SUPPORT_PERCENTAGE = 0.25;

export type StripePaymentService = ReturnType<typeof createStripePaymentService>;

function stripeErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ValidationAppError) return error.message;
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    const message = (error as { message: string }).message;
    return message.trim() ? `Stripe: ${message}` : fallback;
  }
  return fallback;
}

export function createStripePaymentService(deps: {
  stripe: Stripe;
  config: AppConfig;
  organisations: OrganisationRepository;
  logger?: Logger;
}) {
  const { stripe, config, organisations, logger } = deps;

  async function ensureCustomer(organizationId: string): Promise<{
    customerId: string;
    organizationName: string;
  }> {
    const org = await organisations.findById(organizationId);
    if (!org) throw new NotFoundError("Organisation not found");

    let customerId = org.paymentSystem.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: org.name,
        email: org.officeEmail,
        metadata: { organizationId: org.id },
      });
      customerId = customer.id;
      await organisations.updatePaymentSystem(org.id, {
        stripeCustomerId: customerId,
      });
      logger?.info(
        { organizationId: org.id, customerId },
        "Stripe customer created"
      );
    }
    return { customerId, organizationName: org.name };
  }

  async function buildLineItems(
    licences: StripeCheckoutLicences
  ): Promise<Stripe.Checkout.SessionCreateParams.LineItem[]> {
    const [unitBuPrice, unitSuPrice, unitUPrice] = await Promise.all([
      stripe.prices.retrieve(config.STRIPE_BU_PRICE),
      stripe.prices.retrieve(config.STRIPE_SA_PRICE),
      stripe.prices.retrieve(config.STRIPE_USER_PRICE),
    ]);

    const groups = Math.max(0, Math.floor(licences.groups));
    const superUser = Math.max(0, Math.floor(licences.superUser));
    const users = Math.max(0, Math.floor(licences.users));

    const totalSupportUnit =
      ((unitBuPrice.unit_amount ?? 0) / 100) * groups +
      ((unitSuPrice.unit_amount ?? 0) / 100) * superUser +
      ((unitUPrice.unit_amount ?? 0) / 100) * users;

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    if (groups > 0) {
      lineItems.push({ price: config.STRIPE_BU_PRICE, quantity: groups });
    }
    if (superUser > 0) {
      lineItems.push({ price: config.STRIPE_SA_PRICE, quantity: superUser });
    }
    if (users > 0) {
      lineItems.push({ price: config.STRIPE_USER_PRICE, quantity: users });
    }
    if (
      licences.includeToolkitsAndModules &&
      licences.complianceTools.length > 0
    ) {
      lineItems.push({
        price: config.STRIPE_COMPLIANCE_PRICE,
        quantity: licences.complianceTools.length,
      });
    }
    if (
      licences.includeToolkitsAndModules &&
      licences.additionalModules.length > 0
    ) {
      lineItems.push({
        price: config.STRIPE_ADD_MODULE_PRICE,
        quantity: licences.additionalModules.length,
      });
    }
    lineItems.push({
      price: config.STRIPE_SUPPORT_PRICE,
      quantity: Math.max(1, Math.ceil(totalSupportUnit * SUPPORT_PERCENTAGE)),
    });
    return lineItems;
  }

  return {
    async createCheckoutSessionForOrg(input: {
      organizationId: string;
      licences: StripeCheckoutLicences;
    }): Promise<CheckoutSessionResult> {
      const org = await organisations.findById(input.organizationId);
      if (!org) throw new NotFoundError("Organisation not found");
      if (org.paymentSystem.type !== "Card") {
        throw new ValidationAppError(
          "Organisation needs Card payment type to create a checkout session."
        );
      }

      const { customerId, organizationName } = await ensureCustomer(
        input.organizationId
      );
      let lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];
      try {
        lineItems = await buildLineItems(input.licences);
      } catch (error) {
        logger?.error(
          {
            organizationId: input.organizationId,
            err: error instanceof Error ? error.message : String(error),
          },
          "Stripe price retrieve / line-item build failed"
        );
        throw new ValidationAppError(
          stripeErrorMessage(
            error,
            "Unable to load Stripe prices. Confirm STRIPE_*_PRICE ids exist in the same Stripe account/mode as STRIPE_PRIVATE_KEY."
          )
        );
      }
      const clientUrl = config.CLIENT_URL.replace(/\/+$/, "");

      logger?.info(
        { organizationId: input.organizationId, customerId },
        "Creating Stripe checkout session"
      );

      let session: Stripe.Checkout.Session;
      try {
        session = await stripe.checkout.sessions.create({
          mode: "subscription",
          customer: customerId,
          line_items: lineItems,
          success_url: `${clientUrl}/auth/preparation-screen`,
          cancel_url: `${clientUrl}/auth/preparation-screen`,
          metadata: {
            ims_automated_go_live: "true",
            org_id: input.organizationId,
            org_name: organizationName,
          },
        });
      } catch (error) {
        logger?.error(
          {
            organizationId: input.organizationId,
            err: error instanceof Error ? error.message : String(error),
          },
          "Stripe checkout session create failed"
        );
        throw new ValidationAppError(
          stripeErrorMessage(
            error,
            "Unable to create Stripe checkout session. Check price ids are recurring and valid in Test mode."
          )
        );
      }

      if (!session.url) {
        throw new ValidationAppError(
          "Stripe checkout session did not return a URL"
        );
      }
      return { url: session.url, id: session.id };
    },

    async createBillingPortalSession(organizationId: string): Promise<{
      url: string;
    }> {
      const org = await organisations.findById(organizationId);
      if (!org) throw new NotFoundError("Organisation not found");
      const customerId = org.paymentSystem.stripeCustomerId;
      if (!customerId) {
        throw new ValidationAppError(
          "Organisation does not have a Stripe customer id."
        );
      }
      const clientUrl = config.CLIENT_URL.replace(/\/+$/, "");
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${clientUrl}/organisation`,
      });
      return { url: session.url };
    },

    async handleWebhookEvent(rawBody: Buffer, signature: string): Promise<void> {
      let event: Stripe.Event;
      try {
        event = stripe.webhooks.constructEvent(
          rawBody,
          signature,
          config.STRIPE_WEBHOOK_SECRET
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Invalid webhook signature";
        throw new ValidationAppError(`Webhook Error: ${message}`);
      }

      switch (event.type) {
        case "customer.deleted": {
          const customer = event.data.object as Stripe.Customer;
          await organisations.resetPaymentSystemByStripeCustomerId(customer.id);
          logger?.info({ customerId: customer.id }, "Stripe customer deleted");
          break;
        }
        case "customer.subscription.deleted": {
          const sub = event.data.object as Stripe.Subscription;
          const customerId =
            typeof sub.customer === "string" ? sub.customer : sub.customer.id;
          await organisations.markUnsubscribedByStripeCustomerId(customerId);
          logger?.info(
            { customerId, subscriptionId: sub.id },
            "Stripe subscription deleted"
          );
          break;
        }
        case "customer.subscription.updated": {
          const sub = event.data.object as Stripe.Subscription;
          const customerId =
            typeof sub.customer === "string" ? sub.customer : sub.customer.id;
          await organisations.markSubscribedByStripeCustomerId(
            customerId,
            sub.id
          );
          logger?.info(
            { customerId, subscriptionId: sub.id },
            "Stripe subscription updated"
          );
          break;
        }
        case "checkout.session.completed":
          logger?.info({ type: event.type }, "Checkout session completed");
          break;
        default:
          logger?.warn({ type: event.type }, "Unhandled Stripe webhook event");
      }
    },

    async upgradeSubscription(
      subscriptionId: string,
      delta: StripeLicenceDelta
    ): Promise<void> {
      const org = await organisations.findByStripeSubscriptionId(subscriptionId);
      if (!org) {
        throw new NotFoundError(
          "Organisation not found for Stripe subscription"
        );
      }
      if (!org.paymentSystem.stripeCustomerId) {
        throw new ConflictError("Organisation missing Stripe customer id");
      }

      const { data: subscriptionItems } = await stripe.subscriptionItems.list({
        limit: 20,
        subscription: subscriptionId,
      });

      let totalSupportUnit = 0;

      async function bump(priceId: string, addQty: number): Promise<void> {
        if (addQty <= 0) return;
        const item = subscriptionItems.find((row) => row.price.id === priceId);
        if (!item) {
          throw new ValidationAppError(
            `Stripe subscription is missing price item ${priceId}`
          );
        }
        totalSupportUnit += ((item.price.unit_amount ?? 0) / 100) * addQty;
        await stripe.subscriptionItems.update(item.id, {
          quantity: (item.quantity ?? 0) + addQty,
        });
      }

      await bump(config.STRIPE_BU_PRICE, delta.groups);
      await bump(config.STRIPE_SA_PRICE, delta.superUser);
      await bump(config.STRIPE_USER_PRICE, delta.users);

      if (totalSupportUnit > 0) {
        const supportItem = subscriptionItems.find(
          (row) => row.price.id === config.STRIPE_SUPPORT_PRICE
        );
        if (!supportItem) {
          throw new ValidationAppError(
            "Stripe subscription is missing support price item"
          );
        }
        await stripe.subscriptionItems.update(supportItem.id, {
          quantity:
            (supportItem.quantity ?? 0) +
            Math.ceil(totalSupportUnit * SUPPORT_PERCENTAGE),
        });
      }

      if (delta.complianceTools.length > 0) {
        await stripe.invoiceItems.create({
          customer: org.paymentSystem.stripeCustomerId,
          subscription: subscriptionId,
          pricing: { price: config.STRIPE_COMPLIANCE_PRICE },
          quantity: delta.complianceTools.length,
        });
      }
      if (delta.additionalModules.length > 0) {
        await stripe.invoiceItems.create({
          customer: org.paymentSystem.stripeCustomerId,
          subscription: subscriptionId,
          pricing: { price: config.STRIPE_ADD_MODULE_PRICE },
          quantity: delta.additionalModules.length,
        });
      }
    },
  };
}
