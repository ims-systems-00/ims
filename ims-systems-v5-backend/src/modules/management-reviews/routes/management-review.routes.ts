import { Router } from "express";
import type { Authorizer } from "../../../security";
import {
  DevAllManagementReviewsListScopeAdapter,
  NoOpManagementReviewCalendarAdapter,
  NoOpManagementReviewNotificationAdapter,
  NoOpManagementReviewTaskAdapter,
  type ManagementReviewCalendarPort,
  type ManagementReviewListScopePort,
  type ManagementReviewNotificationPort,
  type ManagementReviewTaskPort,
} from "../ports";
import { createManagementReviewRepository } from "../repositories/management-review.repository";
import {
  createManagementReviewService,
  type ManagementReviewService,
} from "../services/management-review.service";
import { createManagementReviewController } from "../controllers/management-review.controller";

export type ManagementReviewRouterDeps = {
  authorizer: Authorizer;
  notifications?: ManagementReviewNotificationPort;
  calendar?: ManagementReviewCalendarPort;
  tasks?: ManagementReviewTaskPort;
  listScope?: ManagementReviewListScopePort;
};

/**
 * Compose Management Review service for route mounting and cross-module adapters.
 */
export function createManagementReviewModule(
  deps: ManagementReviewRouterDeps
): {
  service: ManagementReviewService;
  router: Router;
} {
  const repository = createManagementReviewRepository();
  const service = createManagementReviewService({
    repository,
    authorizer: deps.authorizer,
    notifications:
      deps.notifications ?? new NoOpManagementReviewNotificationAdapter(),
    calendar: deps.calendar ?? new NoOpManagementReviewCalendarAdapter(),
    tasks: deps.tasks ?? new NoOpManagementReviewTaskAdapter(),
    listScope: deps.listScope ?? new DevAllManagementReviewsListScopeAdapter(),
  });
  const controller = createManagementReviewController(service);
  const router = Router();

  router.get("/", controller.list);
  router.get("/stats", controller.stats);
  router.post("/", controller.create);
  router.get("/:id", controller.getById);
  router.patch("/:id", controller.update);
  router.delete("/:id", controller.remove);
  router.post("/:id/complete", controller.complete);
  router.post("/:id/agenda", controller.addAgenda);
  router.delete("/:id/agenda/:attachmentId", controller.removeAgenda);
  router.post("/:id/minutes", controller.addMinutes);
  router.delete("/:id/minutes/:attachmentId", controller.removeMinutes);
  router.post("/:id/attendees", controller.addAttendee);
  router.delete("/:id/attendees/:attendeeId", controller.removeAttendee);

  return { service, router };
}

/**
 * HTTP routes for Management Review.
 * Mounted at /api/v1/management-reviews
 */
export function createManagementReviewRouter(
  deps: ManagementReviewRouterDeps
): Router {
  return createManagementReviewModule(deps).router;
}
