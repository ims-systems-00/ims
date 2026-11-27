/**
 * Live compliance stream client (Server-Sent Events over fetch).
 *
 * fetch streaming instead of EventSource so the normal bearer token and
 * x-org-id headers apply, the same way streamAliceChat works.
 */

import { useSyncExternalStore } from "react";
import { loadPublicEnv } from "@/shared/lib/env";
import { getActiveOrganisationId } from "@/shared/lib/active-organisation";
import { getActiveAuthClient } from "@/security/runtime";
import type { ClauseHealthStatus, LiveModule, LiveStandard } from "../types";

export type LiveStreamEvent =
  | { type: "ready"; data: { at: string } }
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

/** Incremental SSE parser: feed text chunks, get complete events. */
export function createSseParser(onEvent: (event: { type: string; data: unknown }) => void) {
  let buffer = "";
  return (chunk: string) => {
    buffer += chunk.replace(/\r\n/g, "\n");
    let index: number;
    while ((index = buffer.indexOf("\n\n")) >= 0) {
      const block = buffer.slice(0, index);
      buffer = buffer.slice(index + 2);
      let type = "message";
      const data: string[] = [];
      for (const line of block.split("\n")) {
        if (!line || line.startsWith(":")) continue; // comment / heartbeat
        const colon = line.indexOf(":");
        const field = colon < 0 ? line : line.slice(0, colon);
        const value = colon < 0 ? "" : line.slice(colon + 1).replace(/^ /, "");
        if (field === "event") type = value;
        else if (field === "data") data.push(value);
      }
      if (!data.length) continue;
      try {
        onEvent({ type, data: JSON.parse(data.join("\n")) });
      } catch {
        // Ignore malformed payloads rather than dropping the connection.
      }
    }
  };
}

/** Bearer + active organisation headers for raw fetch streaming. */
export async function authHeaders(extra: Record<string, string> = {}): Promise<Record<string, string>> {
  const headers: Record<string, string> = { ...extra };
  const orgId = getActiveOrganisationId();
  if (orgId) headers["x-org-id"] = orgId;
  const auth = getActiveAuthClient();
  if (auth) {
    const token = await auth.getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export class LiveStreamHttpError extends Error {
  constructor(readonly status: number) {
    super(`Live stream failed with status ${status}`);
  }
}

/**
 * Open the stream and resolve when it ends (server closed / network drop).
 * Rejects with LiveStreamHttpError for non-2xx responses.
 */
export async function connectLiveStream(input: {
  signal: AbortSignal;
  onEvent: (event: LiveStreamEvent) => void;
}): Promise<void> {
  const env = loadPublicEnv();
  const headers = await authHeaders({ Accept: "text/event-stream" });

  const response = await fetch(`${env.VITE_API_BASE_URL}/live-compliance/stream`, {
    headers,
    signal: input.signal,
    cache: "no-store",
  });
  if (!response.ok || !response.body) {
    throw new LiveStreamHttpError(response.status);
  }

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  const feed = createSseParser((event) => input.onEvent(event as LiveStreamEvent));
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    if (value) feed(value);
  }
}

// ── Connection status store (drives polling fallback) ─────────────────────
let connected = false;
const listeners = new Set<() => void>();

export function setLiveStreamConnected(next: boolean): void {
  if (connected === next) return;
  connected = next;
  listeners.forEach((listener) => listener());
}

export function isLiveStreamConnected(): boolean {
  return connected;
}

export function useLiveStreamConnected(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => connected,
    () => false
  );
}
