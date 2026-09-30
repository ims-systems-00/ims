import { Router } from "express";
import type { Authorizer } from "../../../security";
import {
  createFunctionalUnitUsersAdapter,
  createUnitMembershipRepository,
  createUserRepository,
  DevAllActiveUsersMembershipAdapter,
  NoOpUserNotificationAdapter,
  type FunctionalUnitUsersPort,
} from "../../users";
import {
  EmptyTaskUnitMembersAdapter,
  NoOpTaskCalendarAdapter,
  NoOpTaskNotificationAdapter,
  type TaskCalendarPort,
  type TaskNotificationPort,
  type TaskUnitMembersPort,
} from "../ports";
import { createTaskRepository } from "../repositories/task.repository";
import { createTaskService, type TaskService } from "../services/task.service";
import { createTaskController } from "../controllers/task.controller";

export type TaskRouterDeps = {
  authorizer: Authorizer;
  notifications?: TaskNotificationPort;
  calendar?: TaskCalendarPort;
  unitMembers?: TaskUnitMembersPort;
  unitUsers?: FunctionalUnitUsersPort;
};

function createUnitMembersFromUsers(
  unitUsers: FunctionalUnitUsersPort
): TaskUnitMembersPort {
  return {
    async listMemberIds(organizationId, businessUnitId) {
      const members = await unitUsers.listMembers(
        organizationId,
        businessUnitId
      );
      return members.map((member) => member.id);
    },
  };
}

/**
 * Compose Task service for route mounting and cross-module adapters.
 */
export function createTaskModule(deps: TaskRouterDeps): {
  service: TaskService;
  router: Router;
} {
  const repository = createTaskRepository();

  let unitMembers = deps.unitMembers;
  if (!unitMembers && deps.unitUsers) {
    unitMembers = createUnitMembersFromUsers(deps.unitUsers);
  }
  if (!unitMembers) {
    const userRepository = createUserRepository();
    const unitMemberships = createUnitMembershipRepository();
    const membershipLookup = new DevAllActiveUsersMembershipAdapter(() =>
      userRepository.listAllActiveIds()
    );
    const unitUsers = createFunctionalUnitUsersAdapter({
      users: userRepository,
      unitMemberships,
      memberships: membershipLookup,
      notifications: new NoOpUserNotificationAdapter(),
      resolveUnitName: async () => null,
    });
    unitMembers = createUnitMembersFromUsers(unitUsers);
  }

  const service = createTaskService({
    repository,
    authorizer: deps.authorizer,
    notifications: deps.notifications ?? new NoOpTaskNotificationAdapter(),
    calendar: deps.calendar ?? new NoOpTaskCalendarAdapter(),
    unitMembers: unitMembers ?? new EmptyTaskUnitMembersAdapter(),
  });
  const controller = createTaskController(service);
  const router = Router();

  router.get("/", controller.list);
  router.get("/analytics/top", controller.topAnalytics);
  router.post("/", controller.create);
  router.get("/:id", controller.getById);
  router.patch("/:id", controller.update);
  router.delete("/:id", controller.remove);
  router.post("/:id/accept", controller.accept);
  router.post("/:id/decline", controller.decline);
  router.post("/:id/complete", controller.complete);
  router.post("/:id/nudge", controller.nudge);
  router.delete("/:id/attachments/:attachmentId", controller.removeAttachment);

  return { service, router };
}

/**
 * HTTP routes for Task Management.
 * Mounted at /api/v1/tasks
 */
export function createTaskRouter(deps: TaskRouterDeps): Router {
  return createTaskModule(deps).router;
}
