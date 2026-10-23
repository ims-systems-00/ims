import { Router } from "express";
import type { EmailSystem } from "../../../infrastructure/queue";
import { createRegisterPublicInterestEmailAdapter } from "../adapters/email.adapter";
import type { RegisterPublicInterestEmailPort } from "../ports";
import { NoOpRegisterPublicInterestEmailAdapter } from "../ports";
import { createRegisterPublicInterestController } from "../controllers/register-public-interest.controller";
import { createRegisterPublicInterestRepository } from "../repositories/register-public-interest.repository";
import {
  createRegisterPublicInterestService,
  type RegisterPublicInterestService,
} from "../services/register-public-interest.service";

export type RegisterPublicInterestRouterDeps = {
  /** Preferred: full EmailSystem from createApp / createEmailSystem. */
  email?: EmailSystem;
  /** Optional narrow port override (tests). */
  emailPort?: RegisterPublicInterestEmailPort;
};

/**
 * Compose Register Public Interest module (public, persisted).
 * Mounted at /api/v1/register-public-interest
 */
export function createRegisterPublicInterestModule(
  deps: RegisterPublicInterestRouterDeps = {}
): {
  service: RegisterPublicInterestService;
  router: Router;
} {
  const service = createRegisterPublicInterestService({
    repository: createRegisterPublicInterestRepository(),
    email:
      deps.emailPort ??
      (deps.email
        ? createRegisterPublicInterestEmailAdapter(deps.email)
        : new NoOpRegisterPublicInterestEmailAdapter()),
  });
  const controller = createRegisterPublicInterestController(service);
  const router = Router();

  // Public — no authorizer.
  router.post("/", controller.register);

  return { service, router };
}

export function createRegisterPublicInterestRouter(
  deps: RegisterPublicInterestRouterDeps = {}
): Router {
  return createRegisterPublicInterestModule(deps).router;
}
