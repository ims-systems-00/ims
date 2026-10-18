/**
 * Public Auth0 BFF session routes — register / login / forgot-password / refresh.
 * No Bearer required. Rate limiting is a documented follow-up.
 */

import { Router } from "express";
import { z } from "zod";
import type { AppConfig } from "../../../config";
import {
  Auth0AuthenticationApi,
  createAuth0AuthenticationApiFromConfig,
  type Auth0TokenResponse,
} from "../../../security/auth0/auth0-authentication-api";
import { createMongoAuth0Lookups } from "../../../security/auth0/create-auth0-lookups";
import { ValidationAppError } from "../../../shared/errors/app-error";
import { sendSuccess } from "../../../shared/http/response";
import { parseWithSchema } from "../../../shared/validation/parse";

function subjectFromAccessToken(accessToken: string): string | null {
  try {
    const part = accessToken.split(".")[1];
    if (!part) return null;
    const json = Buffer.from(
      part.replace(/-/g, "+").replace(/_/g, "/"),
      "base64"
    ).toString("utf8");
    const payload = JSON.parse(json) as { sub?: unknown };
    return typeof payload.sub === "string" && payload.sub.trim()
      ? payload.sub.trim()
      : null;
  } catch {
    return null;
  }
}

/**
 * Auth0 access tokens often omit email; provision IMS user using the form email
 * so the first authenticated API call does not depend on /userinfo.
 */
async function ensureImsUserAfterAuth(input: {
  accessToken: string;
  email: string;
  name?: string;
}): Promise<void> {
  const sub = subjectFromAccessToken(input.accessToken);
  if (!sub) return;
  const lookups = createMongoAuth0Lookups();
  await lookups.ensureUserFromAuth0({
    auth0SubjectId: sub,
    email: input.email,
    name: input.name,
  });
}

const registerBodySchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(128),
  phone: z.string().trim().max(40).optional(),
});

const loginBodySchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(1).max(128),
});

const forgotBodySchema = z.object({
  email: z.string().trim().email().max(320),
});

const refreshBodySchema = z.object({
  refreshToken: z.string().min(1),
});

function toTokenPayload(tokens: Auth0TokenResponse) {
  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken ?? null,
    expiresIn: tokens.expiresIn,
    tokenType: tokens.tokenType,
  };
}

export type AuthRouterDeps = {
  config: AppConfig;
  /** Injected Auth0 client (tests). */
  auth0Api?: Auth0AuthenticationApi;
};

export function createAuthRouter(deps: AuthRouterDeps): Router {
  const router = Router();
  const auth0 =
    deps.auth0Api ?? createAuth0AuthenticationApiFromConfig(deps.config);

  router.post("/register", async (req, res, next) => {
    try {
      const body = parseWithSchema(registerBodySchema, req.body);
      await auth0.signup({
        email: body.email,
        password: body.password,
        firstName: body.firstName,
        lastName: body.lastName,
        phone: body.phone,
      });
      const tokens = await auth0.loginWithPassword(body.email, body.password);
      await ensureImsUserAfterAuth({
        accessToken: tokens.accessToken,
        email: body.email,
        name: `${body.firstName} ${body.lastName}`.trim(),
      });
      sendSuccess(res, toTokenPayload(tokens), 201, req.correlationId);
    } catch (error) {
      next(error);
    }
  });

  router.post("/login", async (req, res, next) => {
    try {
      const body = parseWithSchema(loginBodySchema, req.body);
      const tokens = await auth0.loginWithPassword(body.email, body.password);
      await ensureImsUserAfterAuth({
        accessToken: tokens.accessToken,
        email: body.email,
      });
      sendSuccess(res, toTokenPayload(tokens), 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  });

  router.post("/forgot-password", async (req, res, next) => {
    try {
      const body = parseWithSchema(forgotBodySchema, req.body);
      try {
        await auth0.requestPasswordChange(body.email);
      } catch {
        // Swallow Auth0 failures for unknown emails / transport so callers
        // always see the same generic success (no enumeration).
      }
      sendSuccess(
        res,
        {
          message:
            "If an account exists for that email, password reset instructions have been sent.",
        },
        200,
        req.correlationId
      );
    } catch (error) {
      next(error);
    }
  });

  router.post("/refresh", async (req, res, next) => {
    try {
      const body = parseWithSchema(refreshBodySchema, req.body);
      if (!body.refreshToken?.trim()) {
        throw new ValidationAppError("refreshToken is required");
      }
      const tokens = await auth0.refresh(body.refreshToken);
      sendSuccess(res, toTokenPayload(tokens), 200, req.correlationId);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
