import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { notify } from "@/shared/lib/toast";
import { notificationKeys } from "@/modules/notifications/hooks/use-notifications";
import { complianceKeys } from "@/modules/compliance/hooks/use-compliance";
import { HEALTH_LABELS } from "../lib/health";
import {
  LiveStreamHttpError,
  connectLiveStream,
  setLiveStreamConnected,
  type LiveStreamEvent,
} from "../lib/live-stream";
import { liveComplianceKeys } from "./use-live-compliance";

const MIN_RETRY_MS = 2_000;
const MAX_RETRY_MS = 60_000;

/** Toast copy for a clause transition, or null when it is not worth a toast. */
export function transitionToast(
  event: Extract<LiveStreamEvent, { type: "clause.status.changed" }>["data"]
): { kind: "warning" | "error" | "success"; title: string; description: string } | null {
  const name = `ISO ${event.clause} ${event.title}`;
  if (event.to === "lapsed") {
    return { kind: "error", title: `${name} has lapsed`, description: event.detail };
  }
  if (event.to === "risk") {
    return { kind: "warning", title: `${name} is now ${HEALTH_LABELS.risk}`, description: event.detail };
  }
  if (event.to === "sus" && (event.from === "risk" || event.from === "lapsed")) {
    return { kind: "success", title: `${name} is back to ${HEALTH_LABELS.sus}`, description: event.detail };
  }
  return null;
}

/**
 * Keep one live-compliance stream open for the signed-in organisation.
 * Events refresh the matching queries; transitions into At risk / Lapsed
 * (and recoveries) show a toast. Reconnects with exponential backoff and
 * stops for good on 401/403/404 (no access or feature unavailable).
 */
export function useLiveComplianceStream(enabled: boolean): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    let retryMs = MIN_RETRY_MS;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Several transitions arrive together (one per standard): toast once per clause.
    const toasted = new Map<string, number>();

    const refreshLive = () =>
      void queryClient.invalidateQueries({ queryKey: liveComplianceKeys.all });

    const handle = (event: LiveStreamEvent) => {
      switch (event.type) {
        case "ready":
          retryMs = MIN_RETRY_MS;
          setLiveStreamConnected(true);
          // Catch up on anything missed while disconnected.
          refreshLive();
          break;
        case "clause.status.changed": {
          refreshLive();
          void queryClient.invalidateQueries({ queryKey: complianceKeys.all });
          const copy = transitionToast(event.data);
          const key = `${event.data.clause}|${event.data.to}`;
          const last = toasted.get(key) ?? 0;
          if (copy && Date.now() - last > 5_000) {
            toasted.set(key, Date.now());
            const text = `${copy.title}. ${copy.description}`;
            if (copy.kind === "error") notify.error(text);
            else if (copy.kind === "warning") notify.info(text);
            else notify.success(text);
          }
          break;
        }
        case "health.updated":
        case "advice.updated":
        case "activity.created":
          refreshLive();
          break;
        case "notification.created":
          void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
          break;
      }
    };

    const run = async () => {
      try {
        await connectLiveStream({ signal: controller.signal, onEvent: handle });
      } catch (error) {
        if (controller.signal.aborted) return;
        if (
          error instanceof LiveStreamHttpError &&
          [401, 403, 404].includes(error.status)
        ) {
          setLiveStreamConnected(false);
          return; // Not allowed / not available: polling remains.
        }
      }
      if (controller.signal.aborted) return;
      setLiveStreamConnected(false);
      timer = setTimeout(run, retryMs);
      retryMs = Math.min(retryMs * 2, MAX_RETRY_MS);
    };
    void run();

    return () => {
      controller.abort();
      if (timer) clearTimeout(timer);
      setLiveStreamConnected(false);
    };
  }, [enabled, queryClient]);
}
