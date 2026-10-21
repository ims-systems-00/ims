import Stripe from "stripe";
import type { AppConfig } from "../../config";

/**
 * Stripe SDK client (server secret key only).
 */
export function createStripeClient(config: AppConfig): Stripe {
  return new Stripe(config.STRIPE_PRIVATE_KEY);
}

export type { Stripe };
