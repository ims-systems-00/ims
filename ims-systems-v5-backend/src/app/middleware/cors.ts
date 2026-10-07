import type { RequestHandler } from "express";

const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
] as const;

/** Fallback when the browser does not send Access-Control-Request-Headers. */
const DEFAULT_ALLOWED_HEADERS = [
  "Accept",
  "Content-Type",
  "Authorization",
  "x-correlation-id",
  "x-org-id",
  "x-file-key",
  "x-file-path",
  "x-file-bucket",
  "x-file-name",
  "x-file-public",
].join(", ");

/**
 * Browser CORS for the Vite frontend (different origin than the API).
 * Keep origin allow-list tight; reflect requested headers so File Handler
 * (`x-file-*`) and org context (`x-org-id`) preflights succeed.
 */
export function corsMiddleware(
  allowedOrigins: readonly string[] = DEFAULT_ALLOWED_ORIGINS
): RequestHandler {
  const allowed = new Set(allowedOrigins);

  return (req, res, next) => {
    const origin = req.headers.origin;

    if (origin && allowed.has(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin, Access-Control-Request-Headers");
      res.setHeader(
        "Access-Control-Allow-Methods",
        "GET,POST,PUT,PATCH,DELETE,OPTIONS"
      );
      const requestedHeaders = req.headers["access-control-request-headers"];
      res.setHeader(
        "Access-Control-Allow-Headers",
        typeof requestedHeaders === "string" && requestedHeaders.trim()
          ? requestedHeaders
          : DEFAULT_ALLOWED_HEADERS
      );
      res.setHeader("Access-Control-Expose-Headers", "x-correlation-id");
    }

    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }

    next();
  };
}
