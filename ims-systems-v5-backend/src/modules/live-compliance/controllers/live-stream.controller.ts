/**
 * GET /api/v1/live-compliance/stream — Server-Sent Events.
 *
 * Read by the frontend with fetch streaming (so the normal bearer /
 * session auth applies; EventSource cannot send headers). Emits a `ready`
 * event, then live events, with a comment heartbeat every 25s to keep
 * proxies / load balancers from closing the idle connection.
 */

import type { RequestHandler } from "express";
import type { LiveStreamEvent, LiveStreamHub } from "../services/live-stream-hub";
import type { LiveComplianceService } from "../services/live-compliance.service";

export const STREAM_HEARTBEAT_MS = 25_000;

export function formatSseEvent(event: { type: string; data: unknown }): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
}

export function createLiveStreamController(input: {
  service: LiveComplianceService;
  hub: LiveStreamHub;
  heartbeatMs?: number;
}): { stream: RequestHandler } {
  const heartbeatMs = input.heartbeatMs ?? STREAM_HEARTBEAT_MS;

  const stream: RequestHandler = async (req, res, next) => {
    let access: { organizationId: string; subjectId: string };
    try {
      access = await input.service.streamAccess(req.identity);
    } catch (error) {
      next(error);
      return;
    }

    res.status(200);
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    if (typeof res.flushHeaders === "function") res.flushHeaders();
    req.socket?.setTimeout?.(0);

    const write = (chunk: string) => {
      if (!res.writableEnded) res.write(chunk);
    };

    // Reconnect delay hint, then a ready event so clients know auth passed.
    write("retry: 5000\n\n");
    write(formatSseEvent({ type: "ready", data: { at: new Date().toISOString() } }));

    const unsubscribe = input.hub.subscribe(access.organizationId, {
      userId: access.subjectId,
      send: (event: LiveStreamEvent) => write(formatSseEvent(event)),
    });
    const heartbeat = setInterval(() => write(`: ping\n\n`), heartbeatMs);

    const cleanup = () => {
      clearInterval(heartbeat);
      unsubscribe();
    };
    req.on("close", cleanup);
    res.on("close", cleanup);
  };

  return { stream };
}
