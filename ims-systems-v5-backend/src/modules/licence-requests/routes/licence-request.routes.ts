import { Router } from "express";
import { createLicenceRequestController } from "../controllers/licence-request.controller";
import { createLicenceRequestRepository } from "../repositories/licence-request.repository";
import {
  createLicenceRequestService,
  type LicenceRequestService,
} from "../services/licence-request.service";
import type {
  LicenceAllocationPort,
  LicenceRequestRecipientsPort,
} from "../ports";
import type { EmailSystem } from "../../../infrastructure/queue";
import type { Logger } from "../../../infrastructure/logging/logger";

export type LicenceRequestRouterDeps = {
  allocation: LicenceAllocationPort;
  email?: EmailSystem;
  supportEmails?: string[];
  recipients?: LicenceRequestRecipientsPort;
  logger?: Logger;
};

/**
 * Compose Licence Request module.
 * Mounted at /api/v1/licence-requests
 */
export function createLicenceRequestModule(deps: LicenceRequestRouterDeps): {
  service: LicenceRequestService;
  router: Router;
} {
  const repository = createLicenceRequestRepository();
  const service = createLicenceRequestService({
    repository,
    allocation: deps.allocation,
    email: deps.email,
    supportEmails: deps.supportEmails,
    recipients: deps.recipients,
    logger: deps.logger,
  });
  const controller = createLicenceRequestController(service);
  const router = Router();

  router.post("/", controller.create);
  router.get("/", controller.list);
  router.get("/:id", controller.getById);

  return { service, router };
}

export function createLicenceRequestRouter(
  deps: LicenceRequestRouterDeps
): Router {
  return createLicenceRequestModule(deps).router;
}
