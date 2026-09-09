import type { RequestHandler } from "express";
import type { SecurityPorts } from "../../security";

/**
 * Resolves identity via the configured Authenticator port and attaches
 * security ports to the request for downstream handlers.
 */
export function securityContextMiddleware(
  security: SecurityPorts
): RequestHandler {
  return async (req, _res, next) => {
    try {
      req.security = security;
      req.identity = await security.authenticator.authenticate({
        headers: req.headers,
        cookies: req.cookies as Record<string, string | undefined> | undefined,
      });
      next();
    } catch (error) {
      next(error);
    }
  };
}
