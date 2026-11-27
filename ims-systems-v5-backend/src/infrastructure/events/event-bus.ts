/**
 * Typed in-process event bus.
 *
 * Synchronous fan-out; a failing handler never breaks the emitter or other
 * handlers. Single-instance only: cross-instance delivery (Redis pub/sub)
 * is layered on by consumers that need it.
 */

import type { NextFunction, Request, RequestHandler, Response } from "express";

export type RecordChangedEvent = {
  organizationId: string;
  /** Mount prefix of the module that changed, e.g. "training", "risks". */
  module: string;
  method: string;
  path: string;
  actorUserId: string | null;
  at: Date;
};

export type DomainEventMap = {
  "record.changed": RecordChangedEvent;
};

export type DomainEventName = keyof DomainEventMap;
export type DomainEventHandler<K extends DomainEventName> = (
  event: DomainEventMap[K]
) => void;

export type EventBus = {
  on<K extends DomainEventName>(name: K, handler: DomainEventHandler<K>): () => void;
  emit<K extends DomainEventName>(name: K, event: DomainEventMap[K]): void;
  listenerCount(name: DomainEventName): number;
};

export function createEventBus(options: {
  onHandlerError?: (error: unknown, name: DomainEventName) => void;
} = {}): EventBus {
  const handlers = new Map<DomainEventName, Set<(event: unknown) => void>>();

  return {
    on(name, handler) {
      const set = handlers.get(name) ?? new Set();
      set.add(handler as (event: unknown) => void);
      handlers.set(name, set);
      return () => {
        set.delete(handler as (event: unknown) => void);
      };
    },
    emit(name, event) {
      for (const handler of handlers.get(name) ?? []) {
        try {
          handler(event);
        } catch (error) {
          options.onHandlerError?.(error, name);
        }
      }
    },
    listenerCount(name) {
      return handlers.get(name)?.size ?? 0;
    },
  };
}

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Express middleware: after a successful mutating request under one of the
 * watched mount prefixes, emit `record.changed` for the caller's
 * organisation. Covers every module write path without each service having
 * to know about the bus.
 */
export function createRecordChangeMiddleware(input: {
  bus: EventBus;
  /** Mount prefixes (without slash) whose writes count as record changes. */
  modules: readonly string[];
}): RequestHandler {
  const watched = new Set(input.modules);
  return (req: Request, res: Response, next: NextFunction) => {
    if (!MUTATING_METHODS.has(req.method)) {
      next();
      return;
    }
    const module = req.path.split("/")[1] ?? "";
    if (!watched.has(module)) {
      next();
      return;
    }
    res.on("finish", () => {
      const organizationId = req.identity?.organizationId;
      if (res.statusCode >= 400 || !organizationId) return;
      input.bus.emit("record.changed", {
        organizationId,
        module,
        method: req.method,
        path: req.path,
        actorUserId: req.identity?.subjectId ?? null,
        at: new Date(),
      });
    });
    next();
  };
}
