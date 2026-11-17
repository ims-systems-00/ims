/**
 * Billing port consumed by Organisation (card checkout, portal, upgrades).
 * Spec: docs/module-specifications/stripe-payments.md
 */

import type {
  CheckoutSessionResult,
  StripeCheckoutLicences,
  StripeLicenceDelta,
} from "./types";

export type OrganisationBillingPort = {
  createCheckoutSessionForOrg(input: {
    organizationId: string;
    licences: StripeCheckoutLicences;
  }): Promise<CheckoutSessionResult>;

  /** SME licence Checkout via STRIPE_SME_PRICE (subscription mode). */
  createSmeLicenceCheckoutSession(input: {
    organizationId: string;
  }): Promise<CheckoutSessionResult>;

  /**
   * Confirm a completed SME Checkout session and allocate the SME module.
   * Used when the browser returns from Stripe (webhooks may not reach local/dev).
   */
  confirmSmeLicenceCheckoutSession(input: {
    organizationId: string;
    sessionId?: string;
  }): Promise<{ allocated: boolean; organizationId: string }>;

  createBillingPortalSession(organizationId: string): Promise<{ url: string }>;

  upgradeSubscription(
    subscriptionId: string,
    delta: StripeLicenceDelta
  ): Promise<void>;
};
