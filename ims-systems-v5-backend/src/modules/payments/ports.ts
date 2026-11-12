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

  /** Monthly £100 SME licence Checkout (subscription mode). */
  createSmeLicenceCheckoutSession(input: {
    organizationId: string;
  }): Promise<CheckoutSessionResult>;

  createBillingPortalSession(organizationId: string): Promise<{ url: string }>;

  upgradeSubscription(
    subscriptionId: string,
    delta: StripeLicenceDelta
  ): Promise<void>;
};
