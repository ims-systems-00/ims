/**
 * Notifications domain types — in-app persisted alerts.
 * Spec: docs/module-specifications/notifications.md
 *
 * Phase 1: in-app records only (no WebSocket, email, or preferences).
 */

export const NOTIFICATIONS_RESOURCE = "notifications";

/** Controlled source-module categories (V5 module names + broadcast). */
export const NOTIFICATION_REFERENCE_TYPES = [
  "notifications",
  "tasks",
  "risks",
  "incidents",
  "audits",
  "management-reviews",
  "ofi",
  "suppliers",
  "customers",
  "users",
  "assets",
  "functional-units",
  "documents",
  "calendar",
] as const;
export type NotificationReferenceType =
  (typeof NOTIFICATION_REFERENCE_TYPES)[number];

export const SENT_STATUSES = ["unsent", "sent"] as const;
export type SentStatus = (typeof SENT_STATUSES)[number];

export const READ_STATUSES = ["unread", "read"] as const;
export type ReadStatus = (typeof READ_STATUSES)[number];

export const POPUP_STATUSES = ["unread", "read"] as const;
export type PopupStatus = (typeof POPUP_STATUSES)[number];

export type NotificationStateFlag<TStatus extends string> = {
  status: TStatus;
  on: Date | null;
};

/** Bounded navigation params — not an arbitrary JSON dump. */
export type NotificationParams = {
  id?: string | null;
  businessUnitId?: string | null;
};

export type Notification = {
  id: string;
  organizationId: string;
  recipientUserId: string;
  businessUnitId?: string;
  title: string;
  message: string;
  referenceType: NotificationReferenceType;
  referenceModuleId?: string;
  screenIdentifier?: string;
  params: NotificationParams;
  icon?: string;
  sent: NotificationStateFlag<SentStatus>;
  read: NotificationStateFlag<ReadStatus>;
  popUp: NotificationStateFlag<PopupStatus>;
  isOrganizational: boolean;
  createdBy: string;
  createdOn: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateNotificationRecipientInput = {
  recipientUserId: string;
  title: string;
  message: string;
  referenceType: NotificationReferenceType;
  referenceModuleId?: string;
  screenIdentifier?: string;
  params?: NotificationParams;
  icon?: string;
  businessUnitId?: string;
  /** Default schema behaviour: read (no modal). Nudges set unread. */
  popUpStatus?: PopupStatus;
  isOrganizational?: boolean;
};

export type CreateNotificationsInput = {
  organizationId: string;
  createdBy: string;
  recipients: CreateNotificationRecipientInput[];
};

export type BroadcastNoticeInput = {
  message: string;
  /** Accepted for API compatibility; Phase 1 always broadcasts to all org users. */
  audience?: "all-users" | "heads-of-service";
};

export type ListNotificationsQuery = {
  page: number;
  pageSize: number;
  /** When true, list broadcasts created by the authenticated user. */
  actor?: boolean;
  /** Filter to broadcast notices (referenceType = notifications). */
  push?: boolean;
  sent?: SentStatus;
  read?: ReadStatus;
  popUp?: PopupStatus;
  referenceType?: NotificationReferenceType;
  sortDir?: "asc" | "desc";
};

export type PaginatedNotifications = {
  items: Notification[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type UnsentCount = {
  count: number;
};

/** Hard cap for a single createMany call (broadcast / module fan-out). */
export const MAX_NOTIFICATION_RECIPIENTS = 500;

/** Max length for broadcast / notice message body (spec: 150). */
export const MAX_NOTIFICATION_MESSAGE_LENGTH = 150;

export const MAX_NOTIFICATION_TITLE_LENGTH = 120;
