import { Router } from "express";
import type { Authorizer } from "../../../security";
import type { MembershipProjection } from "../../../security/openfga/membership-projection";
import type { OrganisationBillingPort } from "../../payments/ports";
import { createOrganisationController } from "../controllers/organisation.controller";
import type { OrganisationGoLiveSideEffectsPort } from "../ports";
import { createOrganisationMembershipRepository } from "../repositories/organisation-membership.repository";
import { createOrganisationRepository } from "../repositories/organisation.repository";
import {
  createOrganisationService,
  type OrganisationService,
} from "../services/organisation.service";

export type OrganisationRouterDeps = {
  authorizer: Authorizer;
  membershipProjection?: MembershipProjection;
  goLiveSideEffects?: OrganisationGoLiveSideEffectsPort;
  billing?: OrganisationBillingPort;
  /** Only true for SECURITY_PROVIDER=development-stub. */
  allowStubOrganisationAutoProvision?: boolean;
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
    membershipProjection: deps.membershipProjection,
    goLiveSideEffects: deps.goLiveSideEffects,
    billing: deps.billing,
    allowStubOrganisationAutoProvision:
      deps.allowStubOrganisationAutoProvision === true,
  });
  const controller = createOrganisationController(service);
  const router = Router();

  router.post("/", controller.create);
  router.get("/", controller.listMine);
  router.get("/current", controller.getCurrent);
  // Licence requests live in the licence-requests module
  // (POST /api/v1/licence-requests) so every request gets a record.
  router.put("/current/logo", controller.updateLogo);
  router.put("/current/email-branding", controller.updateEmailBranding);
  router.put(
    "/current/document-review-reminders",
    controller.updateDocumentReviewReminders
  );
  router.put(
    "/current/incident-resolution-targets",
    controller.updateIncidentResolutionTargets
  );
  router.post("/:id/go-live", controller.goLive);
  router.get("/:id/card-payment-session", controller.createCardPaymentSession);
  router.get("/:id/billing-session", controller.createBillingPortalSession);
  router.get("/:id", controller.getById);

  return { service, router };
}

export function createOrganisationRouter(deps: OrganisationRouterDeps): Router {
  return createOrganisationModule(deps).router;
}
