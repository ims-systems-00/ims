import { Router } from "express";
import type { EmailSystem } from "../../../infrastructure/queue";
import type { Logger } from "../../../infrastructure/logging/logger";
import {
  createPartnershipMembershipAdapter,
  createPartnershipOrganisationAdapter,
} from "../adapters/organisations.adapter";
import { createPartnershipController } from "../controllers/partnership.controller";
import { createPartnershipRepository } from "../repositories/partnership.repository";
import {
  createPartnershipService,
  type PartnershipService,
} from "../services/partnership.service";

export type PartnershipRouterDeps = {
  email?: EmailSystem;
  clientUrl: string;
  logger?: Logger;
};

/**
 * Compose Partnership Programme module.
 * Mounted at /api/v1/partnerships
 */
export function createPartnershipModule(deps: PartnershipRouterDeps): {
  service: PartnershipService;
  router: Router;
} {
  const repository = createPartnershipRepository();
  const service = createPartnershipService({
    repository,
    organisations: createPartnershipOrganisationAdapter(),
    memberships: createPartnershipMembershipAdapter(),
    email: deps.email,
    clientUrl: deps.clientUrl,
    logger: deps.logger,
  });
  const controller = createPartnershipController(service);
  const router = Router();

  router.post("/", controller.apply);
  router.get("/mine", controller.listMine);
  router.get("/mine/dashboard", controller.dashboard);
  router.get("/:id", controller.getById);

  return { service, router };
}

export function createPartnershipRouter(deps: PartnershipRouterDeps): Router {
  return createPartnershipModule(deps).router;
}
