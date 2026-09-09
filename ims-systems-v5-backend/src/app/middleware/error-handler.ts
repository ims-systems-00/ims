import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { AppError, ValidationAppError } from "../../shared/errors/app-error";
import { formatZodError } from "../../shared/validation/parse";
import { sendError } from "../../shared/http/response";
import type { Logger } from "../../infrastructure/logging/logger";

export function notFoundHandler(): RequestHandler {
  return (req, res) => {
    sendError(res, {
      statusCode: 404,
      code: "NOT_FOUND",
      message: `Cannot ${req.method} ${req.path}`,
      correlationId: req.correlationId,
    });
  };
}

export function errorHandler(logger: Logger): ErrorRequestHandler {
  return (err, req, res, _next) => {
    const correlationId = req.correlationId;
    const requestLogger = req.log ?? logger;

    if (err instanceof ZodError) {
      sendError(res, {
        statusCode: 400,
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        details: formatZodError(err),
        correlationId,
      });
      return;
    }

    if (err instanceof ValidationAppError) {
      sendError(res, {
        statusCode: err.statusCode,
        code: err.code,
        message: err.message,
        details: err.details,
        correlationId,
      });
      return;
    }

    if (err instanceof AppError) {
      if (err.statusCode >= 500) {
        requestLogger.error({ err, correlationId }, err.message);
      } else {
        requestLogger.warn({ err, correlationId }, err.message);
      }

      sendError(res, {
        statusCode: err.statusCode,
        code: err.code,
        message: err.message,
        details: err.details,
        correlationId,
      });
      return;
    }

    requestLogger.error({ err, correlationId }, "Unhandled error");
    sendError(res, {
      statusCode: 500,
      code: "INTERNAL_ERROR",
      message: "Internal server error",
      correlationId,
    });
  };
}
