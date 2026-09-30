import { Router } from "express";
import type { Authorizer } from "../../../security";
import {
  EmptyNotificationsUsersAdapter,
  type NotificationsUsersPort,
} from "../ports";
import { createNotificationRepository } from "../repositories/notification.repository";
import {
  createNotificationsService,
  type NotificationsApplicationPort,
  type NotificationsService,
} from "../services/notifications.service";
import { createNotificationsController } from "../controllers/notifications.controller";

export type NotificationsRouterDeps = {
  authorizer: Authorizer;
  users?: NotificationsUsersPort;
};

/**
 * Compose Notifications module.
 * Mounted at /api/v1/notifications
 */
export function createNotificationsModule(deps: NotificationsRouterDeps): {
  service: NotificationsService;
  application: NotificationsApplicationPort;
  router: Router;
} {
  const repository = createNotificationRepository();
  const service = createNotificationsService({
    repository,
    authorizer: deps.authorizer,
    users: deps.users ?? new EmptyNotificationsUsersAdapter(),
  });
  const controller = createNotificationsController(service);
  const router = Router();

  router.get("/", controller.list);
  router.get("/unsent-count", controller.unsentCount);
  router.post("/broadcast", controller.broadcast);
  router.patch("/sent", controller.markAllSent);
  router.patch("/popup", controller.markAllPopupsRead);
  router.get("/:id", controller.getById);
  router.patch("/:id/read", controller.markRead);
  router.patch("/:id/popup", controller.markPopup);

  return {
    service,
    application: {
      createForRecipients: (input) => service.createForRecipients(input),
    },
    router,
  };
}

export function createNotificationsRouter(
  deps: NotificationsRouterDeps
): Router {
  return createNotificationsModule(deps).router;
}
