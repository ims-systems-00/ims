import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppSheet } from "@/shared/components/app-sheet";
import { EmptyState } from "@/shared/components/empty-state";
import { Button } from "@/shared/components/ui/button";
import {
  useMarkReadMutation,
  useNotificationsInfiniteQuery,
} from "../hooks/use-notifications";
import { useNotificationsUiStore } from "../store/use-notifications-ui-store";
import type { Notification } from "../types";
import { NotificationItem } from "./notification-item";

export function NotificationDrawer() {
  const navigate = useNavigate();
  const open = useNotificationsUiStore((state) => state.drawerOpen);
  const setDrawerOpen = useNotificationsUiStore((state) => state.setDrawerOpen);

  const listQuery = useNotificationsInfiniteQuery(
    { pageSize: 10, sortDir: "desc" },
    open
  );
  const markRead = useMarkReadMutation();

  const items =
    listQuery.data?.pages.flatMap((page) => page.items) ??
    ([] as Notification[]);

  async function handleSelect(
    notification: Notification,
    href: string | null
  ) {
    try {
      if (notification.read.status === "unread") {
        await markRead.mutateAsync(notification.id);
      }
    } catch {
      // Navigation still proceeds; badge refresh happens on invalidate.
    }
    setDrawerOpen(false);
    if (href) navigate(href);
  }

  return (
    <AppSheet
      open={open}
      onOpenChange={setDrawerOpen}
      title="Notifications"
      description="Alerts from across your organisation."
      className="sm:max-w-md"
    >
      {listQuery.isLoading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading notifications…
        </div>
      ) : listQuery.isError ? (
        <EmptyState
          title="Unable to load notifications"
          description="Try again in a moment."
        />
      ) : items.length === 0 ? (
        <EmptyState
          title="No notifications yet"
          description="When something needs your attention, it will show up here."
        />
      ) : (
        <div className="space-y-1">
          {items.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              pending={markRead.isPending}
              onSelect={(item, href) => void handleSelect(item, href)}
            />
          ))}
          {listQuery.hasNextPage ? (
            <div className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                disabled={listQuery.isFetchingNextPage}
                onClick={() => void listQuery.fetchNextPage()}
              >
                {listQuery.isFetchingNextPage ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : null}
                Load more
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </AppSheet>
  );
}
