import { cn } from "@/shared/lib/utils";
import type { Notification } from "../types";
import {
  formatNotificationTime,
  resolveNotificationLink,
} from "../lib/resolve-notification-link";

type NotificationItemProps = {
  notification: Notification;
  onSelect: (notification: Notification, href: string | null) => void;
  pending?: boolean;
};

export function NotificationItem({
  notification,
  onSelect,
  pending = false,
}: NotificationItemProps) {
  const unread = notification.read.status === "unread";
  const href = resolveNotificationLink(notification);
  const time = formatNotificationTime(
    notification.createdOn || notification.createdAt
  );

  return (
    <button
      type="button"
      disabled={pending}
      className={cn(
        "flex w-full gap-3 rounded-md border border-transparent px-2.5 py-2.5 text-left transition-colors",
        "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        unread && "bg-primary/[0.04]"
      )}
      onClick={() => onSelect(notification, href)}
    >
      <span
        className={cn(
          "mt-1.5 size-2 shrink-0 rounded-full",
          unread ? "bg-primary" : "bg-transparent"
        )}
        aria-hidden
      />
      <span className="min-w-0 flex-1 space-y-1">
        <span className="flex items-start justify-between gap-2">
          <span className="text-[0.8125rem] font-medium text-foreground">
            {notification.title}
          </span>
          {time ? (
            <span className="shrink-0 text-[0.6875rem] text-muted-foreground">
              {time}
            </span>
          ) : null}
        </span>
        <span className="block text-[0.75rem] leading-relaxed text-muted-foreground">
          {notification.message}
        </span>
      </span>
    </button>
  );
}
