/**
 * In-memory live-stream fan-out, scoped per organisation.
 *
 * Single instance: subscribers connected to another API instance do not
 * receive events published here. Their client falls back to polling (5 min)
 * and refetches on reconnect, so nothing is lost, only delayed. Add Redis
 * pub/sub behind `publish` when the API runs on more than one instance.
 */

import type { ClauseHealthStatus, LiveModule, LiveStandard } from "../types";
import type { RecalcResult } from "./live-compliance.service";

export type LiveStreamEvent =
  | {
      type: "clause.status.changed";
      data: {
        standard: LiveStandard;
        clause: string;
        title: string;
        module: LiveModule | null;
        from: ClauseHealthStatus | null;
        to: ClauseHealthStatus;
        detail: string;
      };
    }
  | { type: "health.updated"; data: { evaluatedAt: string; source: string } }
  | { type: "advice.updated"; data: { newAdviceIds: string[] } }
  | { type: "activity.created"; data: { count: number } }
  | { type: "notification.created"; data: { count: number } };

export type LiveStreamSubscriber = {
  userId: string;
  send(event: LiveStreamEvent): void;
};

export type LiveStreamHub = ReturnType<typeof createLiveStreamHub>;

export function createLiveStreamHub() {
  const subscribers = new Map<string, Set<LiveStreamSubscriber>>();

  function publish(
    organizationId: string,
    event: LiveStreamEvent,
    /** Only these users receive it (e.g. notification recipients). */
    recipients?: readonly string[]
  ): number {
    let delivered = 0;
    for (const subscriber of subscribers.get(organizationId) ?? []) {
      if (recipients && !recipients.includes(subscriber.userId)) continue;
      try {
        subscriber.send(event);
        delivered += 1;
      } catch {
        // A broken socket is cleaned up by its own close handler.
      }
    }
    return delivered;
  }

  return {
    subscribe(organizationId: string, subscriber: LiveStreamSubscriber): () => void {
      const set = subscribers.get(organizationId) ?? new Set();
      set.add(subscriber);
      subscribers.set(organizationId, set);
      return () => {
        set.delete(subscriber);
        if (!set.size) subscribers.delete(organizationId);
      };
    },

    publish,

    subscriberCount(organizationId?: string): number {
      if (organizationId) return subscribers.get(organizationId)?.size ?? 0;
      let total = 0;
      for (const set of subscribers.values()) total += set.size;
      return total;
    },

    /** Translate a recalculation into stream events. */
    publishRecalc(result: RecalcResult): void {
      if (!result.changed) return;
      const org = result.organizationId;
      for (const t of result.transitions) {
        publish(org, {
          type: "clause.status.changed",
          data: {
            standard: t.standard,
            clause: t.clause,
            title: t.title,
            module: t.module,
            from: t.from,
            to: t.to,
            detail: t.detail,
          },
        });
      }
      if (result.newAdviceIds.length) {
        publish(org, { type: "advice.updated", data: { newAdviceIds: result.newAdviceIds } });
      }
      if (result.transitions.length) {
        publish(org, { type: "activity.created", data: { count: result.transitions.length } });
      }
      publish(org, {
        type: "health.updated",
        data: { evaluatedAt: result.evaluatedAt.toISOString(), source: result.source },
      });
    },
  };
}
