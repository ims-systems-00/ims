/**
 * Public surface for the Notifications module.
 * Other modules may import only from this entry.
 *
 * Cross-module creation must use NotificationsApplicationPort /
 * service.createForRecipients — never the repository or Mongoose model.
 */

export {
  createNotificationsRouter,
  createNotificationsModule,
} from "./routes/notifications.routes";
export type { NotificationsRouterDeps } from "./routes/notifications.routes";
export { createNotificationsService } from "./services/notifications.service";
export type {
  NotificationsService,
  NotificationsApplicationPort,
} from "./services/notifications.service";
export { createNotificationRepository } from "./repositories/notification.repository";
export { createNotificationsUsersAdapter } from "./adapters/users.adapter";
export {
  EmptyNotificationsUsersAdapter,
} from "./ports";
export type { NotificationsUsersPort } from "./ports";
export type {
  Notification,
  CreateNotificationsInput,
  CreateNotificationRecipientInput,
  BroadcastNoticeInput,
  ListNotificationsQuery,
  PaginatedNotifications,
  UnsentCount,
  NotificationReferenceType,
  SentStatus,
  ReadStatus,
  PopupStatus,
} from "./types";
export {
  NOTIFICATIONS_RESOURCE,
  NOTIFICATION_REFERENCE_TYPES,
  SENT_STATUSES,
  READ_STATUSES,
  POPUP_STATUSES,
  MAX_NOTIFICATION_RECIPIENTS,
  MAX_NOTIFICATION_MESSAGE_LENGTH,
} from "./types";
