import type { RequestHandler } from "express";
import type { Logger } from "../../infrastructure/logging/logger";

export function requestLoggerMiddleware(logger: Logger): RequestHandler {
  return (req, res, next) => {
    const requestLogger = logger.child({
      correlationId: req.correlationId,
      method: req.method,
      path: req.path,
    });
    req.log = requestLogger;

    const started = Date.now();
    res.on("finish", () => {
      requestLogger.info(
        {
          statusCode: res.statusCode,
          durationMs: Date.now() - started,
        },
        "request completed"
      );
    });

    next();
  };
}
