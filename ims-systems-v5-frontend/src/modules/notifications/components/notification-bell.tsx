import { Bell } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import {
  useMarkAllSentMutation,
  useUnsentCountQuery,
} from "../hooks/use-notifications";
import { useNotificationsUiStore } from "../store/use-notifications-ui-store";
import { NotificationDrawer } from "./notification-drawer";

export function NotificationBell() {
  const setDrawerOpen = useNotificationsUiStore((state) => state.setDrawerOpen);
  const unsentQuery = useUnsentCountQuery();
  const markAllSent = useMarkAllSentMutation();
  const count = unsentQuery.data?.count ?? 0;
  const badge =
    count > 99 ? "99+" : count > 0 ? String(count) : null;

  function openDrawer() {
    setDrawerOpen(true);
    if (!markAllSent.isPending) {
      void markAllSent.mutateAsync();
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={
          badge
            ? `Notifications, ${count} new`
            : "Notifications"
        }
        className="relative"
        onClick={openDrawer}
      >
        <Bell className="size-4" />
        {badge ? (
          <span
            className={cn(
              "absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full",
              "bg-destructive px-1 text-[0.625rem] font-semibold leading-none text-destructive-foreground"
            )}
          >
            {badge}
          </span>
        ) : null}
      </Button>
      <NotificationDrawer />
    </>
  );
}
