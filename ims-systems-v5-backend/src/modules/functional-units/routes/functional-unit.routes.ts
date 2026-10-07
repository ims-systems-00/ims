import { Router } from "express";
import type { Authorizer } from "../../../security";
import {
  createFunctionalUnitUsersAdapter,
  createUserRepository,
  createUnitMembershipRepository,
  DevAllActiveUsersMembershipAdapter,
  NoOpUserNotificationAdapter,
  type FunctionalUnitUsersPort,
} from "../../users";
import {
  AlwaysAllowGroupLicenceAdapter,
  NoOpDashboardInitAdapter,
  UnavailableInvitationAdapter,
  type DashboardInitPort,
  type GroupLicencePort,
  type InvitationPort,
} from "../ports";
import { createFunctionalUnitRepository } from "../repositories/functional-unit.repository";
import {
  createFunctionalUnitService,
  type FunctionalUnitService,
} from "../services/functional-unit.service";
import { createFunctionalUnitController } from "../controllers/functional-unit.controller";

export type FunctionalUnitRouterDeps = {
  authorizer: Authorizer;
  groupLicence?: GroupLicencePort;
  dashboardInit?: DashboardInitPort;
  unitUsers?: FunctionalUnitUsersPort;
  invitations?: InvitationPort;
};

/**
 * Compose Functional Units service for route mounting and cross-module adapters.
 */
export function createFunctionalUnitModule(
  deps: FunctionalUnitRouterDeps
): {
  service: FunctionalUnitService;
  unitUsers: FunctionalUnitUsersPort;
  router: Router;
} {
  const repository = createFunctionalUnitRepository();
  const userRepository = createUserRepository();
  const unitMemberships = createUnitMembershipRepository();
  const membershipLookup = new DevAllActiveUsersMembershipAdapter(() =>
    userRepository.listAllActiveIds()
  );

  const unitUsers =
    deps.unitUsers ??
    createFunctionalUnitUsersAdapter({
      users: userRepository,
      unitMemberships,
      memberships: membershipLookup,
      notifications: new NoOpUserNotificationAdapter(),
      resolveUnitName: async (organizationId, functionalUnitId) => {
        const unit = await repository.findById(
          organizationId,
          functionalUnitId
        );
        return unit?.name ?? null;
      },
    });

  const service = createFunctionalUnitService({
    repository,
    authorizer: deps.authorizer,
    groupLicence: deps.groupLicence ?? new AlwaysAllowGroupLicenceAdapter(),
    dashboardInit: deps.dashboardInit ?? new NoOpDashboardInitAdapter(),
    unitUsers,
    invitations: deps.invitations ?? new UnavailableInvitationAdapter(),
  });
  const controller = createFunctionalUnitController(service);
  const router = Router();

  router.get("/", controller.list);
  router.post("/", controller.create);
  router.get("/:id/members", controller.listMembers);
  router.get("/:id/members/eligible", controller.listEligibleMembers);
  router.post("/:id/members", controller.addMembers);
  router.delete("/:id/members/:userId", controller.removeMember);
  router.get("/:id", controller.getById);
  router.patch("/:id", controller.update);
  router.delete("/:id", controller.remove);
  router.post("/:id/policy", controller.attachPolicy);
  router.put("/:id/compliance-toolkits", controller.assignToolkits);

  return { service, unitUsers, router };
}

/**
 * HTTP routes for Functional Units.
 * Mounted at /api/v1/functional-units
 */
export function createFunctionalUnitRouter(
  deps: FunctionalUnitRouterDeps
): Router {
  return createFunctionalUnitModule(deps).router;
}
