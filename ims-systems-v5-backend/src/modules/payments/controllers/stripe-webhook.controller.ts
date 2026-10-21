import type { RequestHandler } from "express";
import { ValidationAppError, sendSuccess } from "../../../shared";
import type { StripePaymentService } from "../services/stripe-payment.service";

export function createStripeWebhookController(
  payments: StripePaymentService
): RequestHandler {
  return async (req, res, next) => {
    try {
      const signature = req.headers["stripe-signature"];
      if (typeof signature !== "string" || !signature) {
        throw new ValidationAppError("Missing Stripe-Signature header");
      }
      if (!Buffer.isBuffer(req.body)) {
        throw new ValidationAppError(
          "Stripe webhook requires a raw request body"
        );
      }
      await payments.handleWebhookEvent(req.body, signature);
      sendSuccess(res, { received: true }, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  };
}
