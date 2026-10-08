/**
 * Notifications domain types — mirror V5 backend Phase 1.
 */

export const NOTIFICATION_REFERENCE_TYPES = [
  "notifications",
  "tasks",
  "risks",
  "incidents",
  "audits",
  "management-reviews",
  "kpi-objectives",
  "ofi",
  "suppliers",
  "customers",
  "users",
  "assets",
  "functional-units",
  "documents",
  "calendar",
  "compliance",
] as const;

export type NotificationReferenceType =
  (typeof NOTIFICATION_REFERENCE_TYPES)[number];

export type SentStatus = "unsent" | "sent";
export type ReadStatus = "unread" | "read";
export type PopupStatus = "unread" | "read";

export type NotificationStateFlag<TStatus extends string> = {
  status: TStatus;
  on: string | null;
};

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
  createdOn: string;
  createdAt: string;
  updatedAt: string;
};

export type ListNotificationsParams = {
  page?: number;
  pageSize?: number;
  actor?: boolean;
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

export type BroadcastNoticeInput = {
  message: string;
  audience?: "all-users" | "heads-of-service";
};

export type MarkAllResult = {
  modifiedCount: number;
};
