import { Router } from "express";
import type { Authorizer } from "../../../security";
import { createOrganisationMembershipRepository } from "../../organisation/repositories/organisation-membership.repository";
import { createUnitMembershipRepository } from "../../users/repositories/unit-membership.repository";
import { createSearchController } from "../controllers/search.controller";
import {
  createGlobalSearchService,
  type GlobalSearchService,
} from "../services/search.service";

export type SearchRouterDeps = {
  authorizer: Authorizer;
  /** Real BU scope sources in auth0-openfga mode; omit for stub (org-wide). */
  useScopedVisibility?: boolean;
};

/**
 * Compose the Search module.
 * Mounted at /api/v1/search
 */
export function createSearchModule(deps: SearchRouterDeps): {
  service: GlobalSearchService;
  router: Router;
} {
  const service = createGlobalSearchService({
    authorizer: deps.authorizer,
    scopeSources: deps.useScopedVisibility
      ? {
          async findRole(organizationId, userId) {
            const row = await createOrganisationMembershipRepository().findByUserAndOrg(
              userId,
              organizationId,
            );
            return row?.role ?? null;
          },
          async listUnitIds(organizationId, userId) {
            return createUnitMembershipRepository().listUnitIdsForUser(
              organizationId,
              userId,
            );
          },
        }
      : undefined,
  });
  const controller = createSearchController(service);
  const router = Router();
  router.get("/", controller.search);
  return { service, router };
}
