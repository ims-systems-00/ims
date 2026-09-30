import { Router } from "express";
import type { Authorizer } from "../../../security";
import {
  DevAllActiveUsersMembershipAdapter,
  NoOpComplianceToolkitAdapter,
  NoOpOwnershipIntegrityAdapter,
  NoOpSessionAdapter,
  NoOpUserNotificationAdapter,
  type ComplianceToolkitPort,
  type MembershipLookupPort,
  type OwnershipIntegrityPort,
  type SessionPort,
  type UserNotificationPort,
} from "../ports";
import { createUserRepository } from "../repositories/user.repository";
import {
  createUsersService,
  type UsersService,
} from "../services/users.service";
import { createUsersController } from "../controllers/users.controller";

export type UsersRouterDeps = {
  authorizer: Authorizer;
  memberships?: MembershipLookupPort;
  sessions?: SessionPort;
  notifications?: UserNotificationPort;
  ownership?: OwnershipIntegrityPort;
  toolkits?: ComplianceToolkitPort;
};

/**
 * Compose Users service for route mounting and cross-module adapters.
 */
export function createUsersModule(deps: UsersRouterDeps): {
  service: UsersService;
  router: Router;
} {
  const repository = createUserRepository();
  const memberships =
    deps.memberships ??
    new DevAllActiveUsersMembershipAdapter(() =>
      repository.listAllActiveIds()
    );

  const service = createUsersService({
    repository,
    authorizer: deps.authorizer,
    memberships,
    sessions: deps.sessions ?? new NoOpSessionAdapter(),
    notifications: deps.notifications ?? new NoOpUserNotificationAdapter(),
    ownership: deps.ownership ?? new NoOpOwnershipIntegrityAdapter(),
    toolkits: deps.toolkits ?? new NoOpComplianceToolkitAdapter(),
  });
  const controller = createUsersController(service);
  const router = Router();

  router.get("/", controller.list);
  router.post("/", controller.create);
  router.post("/expired-users", controller.blockExpired);
  router.put("/reset-password", controller.resetPassword);

  router.get("/:id/classified-info", controller.getClassified);
  router.get("/:id/basic-info", controller.getBasic);
  router.get("/:id/profile-image", controller.getProfileImage);
  router.put("/:id/profile-image", controller.updateProfileImage);
  router.put("/:id/signature", controller.updateSignature);
  router.put("/:id/preferences", controller.updatePreferences);
  router.put("/:id/ims-access", controller.updateSystemAccess);
  router.put("/:id/change-password", controller.changePassword);
  router.post("/:id/locations", controller.addLocation);
  router.delete("/:id/locations/:locationId", controller.removeLocation);
  router.put("/:id/compliance-tools", controller.assignToolkits);
  router.post("/:id/resend-verification", controller.resendVerification);
  router.post("/:id/ownership-checks", controller.checkOwnership);
  router.post("/:id/ownership-transfer", controller.transferOwnership);

  router.patch("/:id", controller.updateProfile);
  router.put("/:id", controller.updateProfile);
  router.delete("/:id", controller.remove);
  router.get("/:id", controller.getClassified);

  return { service, router };
}

/**
 * HTTP routes for Users.
 * Mounted at /api/v1/users
 */
export function createUsersRouter(deps: UsersRouterDeps): Router {
  return createUsersModule(deps).router;
}
