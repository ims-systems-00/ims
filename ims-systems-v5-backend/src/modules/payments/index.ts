/**
 * Stripe payments module (billing).
 * Spec: docs/module-specifications/stripe-payments.md
 */

export { createStripePaymentService } from "./services/stripe-payment.service";
export type { StripePaymentService } from "./services/stripe-payment.service";
export { createStripeWebhookRouter } from "./routes/stripe-webhook.routes";
export { createStripeGoLiveSideEffectsAdapter } from "./adapters/stripe-go-live.adapter";
export type { OrganisationBillingPort } from "./ports";
export type {
  CheckoutSessionResult,
  StripeCheckoutLicences,
  StripeLicenceDelta,
} from "./types";
