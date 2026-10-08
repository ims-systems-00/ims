import { apiRequest } from "@/shared/lib/http";
import type {
  BroadcastNoticeInput,
  ListNotificationsParams,
  MarkAllResult,
  Notification,
  PaginatedNotifications,
  UnsentCount,
} from "../types";

function toQuery(params: ListNotificationsParams = {}): string {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.pageSize) search.set("pageSize", String(params.pageSize));
  if (params.actor !== undefined) search.set("actor", String(params.actor));
  if (params.push !== undefined) search.set("push", String(params.push));
  if (params.sent) search.set("sent", params.sent);
  if (params.read) search.set("read", params.read);
  if (params.popUp) search.set("popUp", params.popUp);
  if (params.referenceType) search.set("referenceType", params.referenceType);
  if (params.sortDir) search.set("sortDir", params.sortDir);
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function listNotifications(
  params?: ListNotificationsParams
): Promise<PaginatedNotifications> {
  return apiRequest<PaginatedNotifications>(
    `/notifications${toQuery(params)}`
  );
}

export function getUnsentCount(): Promise<UnsentCount> {
  return apiRequest<UnsentCount>("/notifications/unsent-count");
}

export function getNotification(id: string): Promise<Notification> {
  return apiRequest<Notification>(`/notifications/${id}`);
}

export function markAllSent(): Promise<MarkAllResult> {
  return apiRequest<MarkAllResult>("/notifications/sent", {
    method: "PATCH",
  });
}

export function markNotificationRead(id: string): Promise<Notification> {
  return apiRequest<Notification>(`/notifications/${id}/read`, {
    method: "PATCH",
  });
}

export function markNotificationPopup(
  id: string,
  status: "read" | "unread" = "read"
): Promise<Notification> {
  return apiRequest<Notification>(`/notifications/${id}/popup`, {
    method: "PATCH",
    body: { status },
  });
}

export function markAllPopupsRead(): Promise<MarkAllResult> {
  return apiRequest<MarkAllResult>("/notifications/popup", {
    method: "PATCH",
  });
}

export function broadcastNotice(
  body: BroadcastNoticeInput
): Promise<Notification[]> {
  return apiRequest<Notification[]>("/notifications/broadcast", {
    method: "POST",
    body,
  });
}
