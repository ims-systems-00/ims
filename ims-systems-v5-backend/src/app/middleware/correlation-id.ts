import type { RequestHandler } from "express";
import { randomUUID } from "node:crypto";

const CORRELATION_HEADER = "x-correlation-id";

export function correlationIdMiddleware(): RequestHandler {
  return (req, res, next) => {
    const incoming = req.header(CORRELATION_HEADER);
    const correlationId =
      incoming && incoming.trim().length > 0 ? incoming.trim() : randomUUID();
    req.correlationId = correlationId;
    res.setHeader(CORRELATION_HEADER, correlationId);
    next();
  };
}
