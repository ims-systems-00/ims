import { Router } from "express";
import type { Authorizer } from "../../../security";
import type { EmailSystem } from "../../../infrastructure/queue";
import { createCampaignAudienceAdapter } from "../adapters/audience.adapter";
import { createCampaignEmailAdapter } from "../adapters/email.adapter";
import { createCampaignOrganisationAdapter } from "../adapters/organisation.adapter";
import { createEmailCampaignController } from "../controllers/email-campaign.controller";
import {
  NoOpCampaignAudienceAdapter,
  NoOpCampaignEmailAdapter,
  NoOpCampaignOrganisationAdapter,
  type CampaignAudiencePort,
  type CampaignEmailPort,
  type CampaignOrganisationPort,
} from "../ports";
import { createCampaignDeliveryRepository } from "../repositories/campaign-delivery.repository";
import { createEmailCampaignRepository } from "../repositories/email-campaign.repository";
import {
  createEmailCampaignService,
  type EmailCampaignService,
} from "../services/email-campaign.service";

export type EmailCampaignRouterDeps = {
  authorizer: Authorizer;
  email?: EmailSystem;
  audience?: CampaignAudiencePort;
  organisation?: CampaignOrganisationPort;
  emailPort?: CampaignEmailPort;
};

/**
 * Compose Email Campaign service for route mounting and cross-module adapters.
 */
export function createEmailCampaignModule(deps: EmailCampaignRouterDeps): {
  service: EmailCampaignService;
  router: Router;
} {
  const repository = createEmailCampaignRepository();
  const deliveries = createCampaignDeliveryRepository();
  const service = createEmailCampaignService({
    repository,
    deliveries,
    authorizer: deps.authorizer,
    audience: deps.audience ?? createCampaignAudienceAdapter(),
    organisation:
      deps.organisation ?? createCampaignOrganisationAdapter(),
    email:
      deps.emailPort ??
      (deps.email
        ? createCampaignEmailAdapter(deps.email)
        : new NoOpCampaignEmailAdapter()),
  });
  const controller = createEmailCampaignController(service);
  const router = Router();

  router.get("/", controller.list);
  router.post("/", controller.create);
  router.post("/launch", controller.createAndLaunch);
  router.get("/:id/overview", controller.overview);
  router.get("/:id/deliveries", controller.listDeliveries);
  router.post("/:id/launch", controller.launch);
  router.post("/:id/close", controller.close);
  router.get("/:id", controller.getById);
  router.patch("/:id", controller.update);
  router.delete("/:id", controller.remove);
  router.delete("/:id/attachments/:attachmentId", controller.removeAttachment);

  return { service, router };
}

/**
 * HTTP routes for Email Campaign (CRM).
 * Mounted at /api/v1/email-campaigns
 */
export function createEmailCampaignRouter(
  deps: EmailCampaignRouterDeps
): Router {
  return createEmailCampaignModule(deps).router;
}

export {
  NoOpCampaignAudienceAdapter,
  NoOpCampaignEmailAdapter,
  NoOpCampaignOrganisationAdapter,
};
