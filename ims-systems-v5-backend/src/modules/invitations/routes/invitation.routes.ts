import { Router } from "express";
import type { EmailSystem } from "../../../infrastructure/queue";
import type { Logger } from "../../../infrastructure/logging/logger";
import type { Authorizer, MembershipProjection } from "../../../security";
import {
  createInvitationEmailAdapter,
  createInvitationMembershipAdapter,
  createInvitationOrganisationAdapter,
  createInvitationUserAdapter,
} from "../adapters";
import { createInvitationController } from "../controllers/invitation.controller";
import { createInvitationRepository } from "../repositories/invitation.repository";
import {
  createInvitationService,
  type InvitationService,
} from "../services/invitation.service";

export type InvitationRouterDeps = {
  authorizer: Authorizer;
  email?: EmailSystem;
  membershipProjection?: MembershipProjection;
  /** Base URL for emailed acceptance links. */
  clientUrl: string;
  logger?: Logger;
};

/**
 * Compose the Invitations module.
 * Mounted at /api/v1/invitations
 */
export function createInvitationModule(deps: InvitationRouterDeps): {
  service: InvitationService;
  router: Router;
} {
  const service = createInvitationService({
    repository: createInvitationRepository(),
    authorizer: deps.authorizer,
    organisations: createInvitationOrganisationAdapter(),
    memberships: createInvitationMembershipAdapter(),
    users: createInvitationUserAdapter(),
    email: createInvitationEmailAdapter(deps.email),
    membershipProjection: deps.membershipProjection,
    clientUrl: deps.clientUrl,
  });
  const controller = createInvitationController(service);
  const router = Router();

  // Recipient + token routes first so they are not captured by `/:id`.
  router.get("/received", controller.listReceived);
  router.get("/preview/:token", controller.preview);
  router.post("/accept", controller.accept);

  router.post("/", controller.create);
  router.get("/", controller.list);
  router.get("/:id", controller.getById);
  router.post("/:id/resend", controller.resend);
  router.delete("/:id", controller.remove);

  return { service, router };
}

export function createInvitationRouter(deps: InvitationRouterDeps): Router {
  return createInvitationModule(deps).router;
}
