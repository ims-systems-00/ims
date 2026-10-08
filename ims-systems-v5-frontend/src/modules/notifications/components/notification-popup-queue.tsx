import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  useMarkAllPopupsReadMutation,
  usePopupNotificationsQuery,
} from "../hooks/use-notifications";
import { resolveNotificationLink } from "../lib/resolve-notification-link";
import type { Notification } from "../types";

/**
 * Shows high-priority popup notifications one at a time (V4 parity),
 * then bulk-marks popup status as read.
 */
export function NotificationPopupQueue() {
  const navigate = useNavigate();
  const popupQuery = usePopupNotificationsQuery(true);
  const markAllPopups = useMarkAllPopupsReadMutation();
  const [queue, setQueue] = useState<Notification[]>([]);
  const [index, setIndex] = useState(0);
  const [sessionDone, setSessionDone] = useState(false);

  useEffect(() => {
    if (sessionDone) return;
    const items = popupQuery.data?.items ?? [];
    if (items.length === 0) return;
    setQueue(items);
    setIndex(0);
  }, [popupQuery.data, sessionDone]);

  const current = queue[index] ?? null;
  const open = Boolean(current);

  async function finishQueue() {
    setSessionDone(true);
    setQueue([]);
    setIndex(0);
    try {
      await markAllPopups.mutateAsync();
    } catch {
      // Ignore — user already dismissed the UI.
    }
  }

  function handleDismiss() {
    if (index + 1 < queue.length) {
      setIndex((value) => value + 1);
      return;
    }
    void finishQueue();
  }

  function handleOpen() {
    if (!current) return;
    const href = resolveNotificationLink(current);
    handleDismiss();
    if (href) navigate(href);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) handleDismiss();
      }}
    >
      <DialogContent showClose={false} className="max-w-md">
        <DialogHeader>
          <DialogTitle>{current?.title ?? "Notification"}</DialogTitle>
          <DialogDescription className="text-[0.875rem] leading-relaxed text-foreground">
            {current?.message}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleDismiss}>
            Dismiss
          </Button>
          {current && resolveNotificationLink(current) ? (
            <Button type="button" onClick={handleOpen}>
              Open
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
