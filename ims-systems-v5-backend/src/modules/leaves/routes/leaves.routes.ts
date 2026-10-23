import { Router } from "express";
import type { Authorizer } from "../../../security";
import {
  NoOpLeavesCalendarAdapter,
  NoOpLeavesMembershipAdapter,
  NoOpLeavesNotificationAdapter,
  type LeavesCalendarPort,
  type LeavesMembershipPort,
  type LeavesNotificationPort,
} from "../ports";
import { createLeaveRepository } from "../repositories/leave.repository";
import {
  createLeavesService,
  type LeavesService,
} from "../services/leaves.service";
import { createLeavesController } from "../controllers/leaves.controller";

export type LeavesRouterDeps = {
  authorizer: Authorizer;
  notifications?: LeavesNotificationPort;
  calendar?: LeavesCalendarPort;
  memberships?: LeavesMembershipPort;
};

/**
 * Compose Leaves service for route mounting and cross-module adapters.
 */
export function createLeavesModule(deps: LeavesRouterDeps): {
  service: LeavesService;
  router: Router;
} {
  const service = createLeavesService({
    repository: createLeaveRepository(),
    authorizer: deps.authorizer,
    notifications: deps.notifications ?? new NoOpLeavesNotificationAdapter(),
    calendar: deps.calendar ?? new NoOpLeavesCalendarAdapter(),
    memberships: deps.memberships ?? new NoOpLeavesMembershipAdapter(),
  });
  const controller = createLeavesController(service);
  const router = Router();

  router.get("/", controller.list);
  router.get("/holidays", controller.holidays);
  router.post("/", controller.create);
  router.get("/:id", controller.getById);
  router.patch("/:id", controller.update);
  router.delete("/:id", controller.remove);
  router.post("/:id/submit", controller.submit);
  router.post("/:id/evaluate", controller.evaluate);

  return { service, router };
}

/**
 * HTTP routes for Leaves.
 * Mounted at /api/v1/leaves
 */
export function createLeavesRouter(deps: LeavesRouterDeps): Router {
  return createLeavesModule(deps).router;
}
