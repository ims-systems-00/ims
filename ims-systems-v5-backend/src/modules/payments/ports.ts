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

  createBillingPortalSession(organizationId: string): Promise<{ url: string }>;

  upgradeSubscription(
    subscriptionId: string,
    delta: StripeLicenceDelta
  ): Promise<void>;
};
