import { Router } from "express";
import type { StripePaymentService } from "../services/stripe-payment.service";
import { createStripeWebhookController } from "../controllers/stripe-webhook.controller";

/**
 * Stripe webhook router. Must be mounted with `express.raw` (no JSON parser).
 * Path: POST /api/v1/webhooks/stripe
 */
export function createStripeWebhookRouter(
  payments: StripePaymentService
): Router {
  const router = Router();
  router.post("/", createStripeWebhookController(payments));
  return router;
}
