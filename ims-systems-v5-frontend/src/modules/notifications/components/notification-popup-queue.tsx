import { useEffect, useRef, useState } from "react";
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
  useMarkPopupMutation,
  usePopupNotificationsQuery,
} from "../hooks/use-notifications";
import { resolveNotificationLink } from "../lib/resolve-notification-link";
import type { Notification } from "../types";

/**
 * Shows high-priority popup notifications one at a time (V4 parity).
 *
 * - The queue is snapshotted when it opens; background refetches never reset
 *   it mid-way (they used to jump back to the first item every 60s / on focus).
 * - Each dismissed popup is marked read immediately, so progress survives a reload.
 * - Clicking outside / Escape / "Dismiss all" closes the whole queue and marks
 *   every popup read, so the user is never trapped behind a long backlog.
 * - Popups already shown this session are never re-queued, even if the
 *   mark-read request failed.
 */
export function NotificationPopupQueue() {
  const navigate = useNavigate();
  const popupQuery = usePopupNotificationsQuery(true);
  const markPopup = useMarkPopupMutation();
  const markAllPopups = useMarkAllPopupsReadMutation();
  const [queue, setQueue] = useState<Notification[]>([]);
  const [index, setIndex] = useState(0);
  const seenIds = useRef(new Set<string>());

  const current = queue[index] ?? null;
  const open = Boolean(current);

  useEffect(() => {
    if (open) return; // never disturb a queue that is on screen
    const fresh = (popupQuery.data?.items ?? []).filter(
      (item) => !seenIds.current.has(item.id)
    );
    if (fresh.length === 0) return;
    for (const item of fresh) seenIds.current.add(item.id);
    setQueue(fresh);
    setIndex(0);
  }, [popupQuery.data, open]);

  function closeQueue() {
    setQueue([]);
    setIndex(0);
  }

  function dismissCurrent() {
    if (!current) return;
    markPopup.mutate(current.id);
    if (index + 1 < queue.length) {
      setIndex((value) => value + 1);
    } else {
      closeQueue();
    }
  }

  function dismissAll() {
    closeQueue();
    markAllPopups.mutate();
  }

  function handleOpen() {
    if (!current) return;
    const href = resolveNotificationLink(current);
    dismissAll();
    if (href) navigate(href);
  }

  const remaining = queue.length - index;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) dismissAll();
      }}
    >
      <DialogContent showClose={false} className="max-w-md">
        <DialogHeader>
          <DialogTitle>{current?.title ?? "Notification"}</DialogTitle>
          {current?.message && current.message !== current.title ? (
            <DialogDescription className="text-[0.875rem] leading-relaxed text-foreground">
              {current.message}
            </DialogDescription>
          ) : (
            <DialogDescription className="sr-only">
              {current?.title ?? "Notification"}
            </DialogDescription>
          )}
          {queue.length > 1 ? (
            <p className="text-xs text-muted-foreground">
              {index + 1} of {queue.length}
            </p>
          ) : null}
        </DialogHeader>
        <DialogFooter>
          {remaining > 1 ? (
            <Button type="button" variant="ghost" onClick={dismissAll}>
              Dismiss all
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={dismissCurrent}>
            {remaining > 1 ? "Next" : "Dismiss"}
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
