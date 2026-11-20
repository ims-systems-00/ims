import { Router } from "express";
import { z } from "zod";
import {
  NAV_CAPABILITY_RESOURCE_TYPES,
  type Authorizer,
} from "../../../security";
import {
  ForbiddenError,
  UnauthorizedError,
  parseWithSchema,
  sendSuccess,
} from "../../../shared";

const checkBodySchema = z.object({
  action: z.string().min(1),
  resourceType: z.string().min(1),
  resourceId: z.string().min(1).optional(),
  organizationId: z.string().min(1).optional(),
});

/**
 * AuthZ introspection for the SPA (nav + AuthzClient).
 * Mounted at /api/v1/security
 */
export function createSecurityRouter(authorizer: Authorizer): Router {
  const router = Router();

  router.post("/check", async (req, res, next) => {
    try {
      if (!req.identity?.subjectId) {
        throw new UnauthorizedError();
      }
      const body = parseWithSchema(checkBodySchema, req.body);
      const organizationId =
        body.organizationId ?? req.identity.organizationId ?? undefined;
      const allowed = await authorizer.allow({
        identity: req.identity,
        action: body.action,
        resourceType: body.resourceType,
        resourceId: body.resourceId,
        organizationId,
      });
      sendSuccess(res, { allowed }, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  });

  router.get("/capabilities", async (req, res, next) => {
    try {
      if (!req.identity?.subjectId) {
        throw new UnauthorizedError();
      }
      const organizationId = req.identity.organizationId?.trim();
      if (!organizationId) {
        throw new ForbiddenError("Organisation context required");
      }

      // SPA gates use `{resource}:{action}` (e.g. suppliers:create). Emit
      // create/update/delete as well as read — read-only used to hide Add buttons.
      const capabilityActions = ["read", "create", "update", "delete"] as const;
      const permissions: string[] = [];
      for (const resourceType of NAV_CAPABILITY_RESOURCE_TYPES) {
        for (const action of capabilityActions) {
          const allowed = await authorizer.allow({
            identity: req.identity,
            action,
            resourceType,
            organizationId,
          });
          if (allowed) {
            permissions.push(`${resourceType}:${action}`);
          }
        }
      }

      sendSuccess(res, { permissions }, 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
