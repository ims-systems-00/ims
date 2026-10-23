import { Router } from "express";
import type { EmailSystem } from "../../../infrastructure/queue";
import { createContactImsEmailAdapter } from "../adapters/email.adapter";
import type { ContactImsEmailPort } from "../ports";
import { NoOpContactImsEmailAdapter } from "../ports";
import { createContactImsController } from "../controllers/contact-ims.controller";
import {
  createContactImsService,
  type ContactImsService,
} from "../services/contact-ims.service";

export type ContactImsRouterDeps = {
  /** Preferred: full EmailSystem from createApp / createEmailSystem. */
  email?: EmailSystem;
  /** Optional narrow port override (tests). */
  emailPort?: ContactImsEmailPort;
  supportEmails: string[];
  /** Delay between support + confirmation emails (Mailtrap rate limits). */
  confirmationDelayMs?: number;
};

/**
 * Compose Contact IMS module (public, email-only, no persistence).
 * Mounted at /api/v1/contact-ims
 */
export function createContactImsModule(deps: ContactImsRouterDeps): {
  service: ContactImsService;
  router: Router;
} {
  const service = createContactImsService({
    email:
      deps.emailPort ??
      (deps.email
        ? createContactImsEmailAdapter(deps.email)
        : new NoOpContactImsEmailAdapter()),
    supportEmails: deps.supportEmails,
    confirmationDelayMs: deps.confirmationDelayMs,
  });
  const controller = createContactImsController(service);
  const router = Router();

  // Public — no authorizer.
  router.get("/booked-dates", controller.bookedDates);
  router.post("/book-date", controller.bookDate);
  router.post("/get-started", controller.getStarted);

  return { service, router };
}

export function createContactImsRouter(deps: ContactImsRouterDeps): Router {
  return createContactImsModule(deps).router;
}
