import { Router } from "express";
import type { Authorizer } from "../../../security";
import { createOrganisationController } from "../controllers/organisation.controller";
import { createOrganisationMembershipRepository } from "../repositories/organisation-membership.repository";
import { createOrganisationRepository } from "../repositories/organisation.repository";
import {
  createOrganisationService,
  type OrganisationService,
} from "../services/organisation.service";

export type OrganisationRouterDeps = {
  authorizer: Authorizer;
};

/**
 * Compose Organisation module.
 * Mounted at /api/v1/organisations
 */
export function createOrganisationModule(deps: OrganisationRouterDeps): {
  service: OrganisationService;
  router: Router;
} {
  const organisations = createOrganisationRepository();
  const memberships = createOrganisationMembershipRepository();
  const service = createOrganisationService({
    organisations,
    memberships,
    authorizer: deps.authorizer,
  });
  const controller = createOrganisationController(service);
  const router = Router();

  router.post("/", controller.create);
  router.get("/", controller.listMine);
  router.get("/current", controller.getCurrent);
  router.get("/:id", controller.getById);

  return { service, router };
}

export function createOrganisationRouter(deps: OrganisationRouterDeps): Router {
  return createOrganisationModule(deps).router;
}
