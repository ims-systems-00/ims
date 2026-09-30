import type { RequestHandler } from "express";

const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
] as const;

/**
 * Browser CORS for the Vite frontend (different origin than the API).
 * Keep allow-list tight; expand via env later if needed for staging hosts.
 */
export function corsMiddleware(
  allowedOrigins: readonly string[] = DEFAULT_ALLOWED_ORIGINS
): RequestHandler {
  const allowed = new Set(allowedOrigins);

  return (req, res, next) => {
    const origin = req.headers.origin;

    if (origin && allowed.has(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader(
        "Access-Control-Allow-Methods",
        "GET,POST,PUT,PATCH,DELETE,OPTIONS"
      );
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, x-correlation-id"
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
