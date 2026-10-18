import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createTestApp, type TestContext } from "./helpers/create-test-app";
import { createApp } from "../src/app/create-app";
import { createLogger } from "../src/infrastructure/logging/logger";
import { createEmailSystem } from "../src/infrastructure/queue";
import {
  Auth0AuthenticationApi,
  type Auth0TokenResponse,
} from "../src/security/auth0/auth0-authentication-api";
import {
  ConflictError,
  UnauthorizedError,
} from "../src/shared/errors/app-error";

const sampleTokens: Auth0TokenResponse = {
  accessToken: "access-tok",
  refreshToken: "refresh-tok",
  expiresIn: 3600,
  tokenType: "Bearer",
};

describe("Auth session BFF HTTP", () => {
  let ctx: TestContext | undefined;
  let auth0Api: {
    signup: ReturnType<typeof vi.fn>;
    loginWithPassword: ReturnType<typeof vi.fn>;
    requestPasswordChange: ReturnType<typeof vi.fn>;
    refresh: ReturnType<typeof vi.fn>;
  };

  beforeAll(async () => {
    ctx = await createTestApp({
      AUTH0_DOMAIN: "example.auth0.com",
      AUTH0_AUDIENCE: "https://api.example.local",
      AUTH0_DB_CONNECTION: "Username-Password-Authentication",
      AUTH0_SPA_CLIENT_ID: "spa-client",
      AUTH0_ROPG_CLIENT_ID: "ropg-client",
      AUTH0_ROPG_CLIENT_SECRET: "ropg-secret",
    });

    auth0Api = {
      signup: vi.fn().mockResolvedValue(undefined),
      loginWithPassword: vi.fn().mockResolvedValue(sampleTokens),
      requestPasswordChange: vi.fn().mockResolvedValue(undefined),
      refresh: vi.fn().mockResolvedValue(sampleTokens),
    };

    const logger = createLogger({ level: "silent" });
    const email = createEmailSystem({ config: ctx.config, logger });
    const { app } = createApp({
      config: ctx.config,
      logger,
      mongo: ctx.mongo,
      email,
      auth0Api: auth0Api as unknown as Auth0AuthenticationApi,
    });
    ctx.app = app;
  }, 60_000);

  afterAll(async () => {
    if (ctx) await ctx.cleanup();
  });

  it("POST /auth/register signs up then returns tokens", async () => {
    const res = await request(ctx!.app)
      .post("/api/v1/auth/register")
      .send({
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
        password: "Str0ng-Pass!",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      accessToken: "access-tok",
      refreshToken: "refresh-tok",
      expiresIn: 3600,
      tokenType: "Bearer",
    });
    expect(auth0Api.signup).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "ada@example.com",
        firstName: "Ada",
        lastName: "Lovelace",
      })
    );
    expect(auth0Api.loginWithPassword).toHaveBeenCalledWith(
      "ada@example.com",
      "Str0ng-Pass!"
    );
  });

  it("POST /auth/register maps Auth0 user_exists to 409", async () => {
    auth0Api.signup.mockRejectedValueOnce(
      new ConflictError("An account with this email already exists")
    );

    const res = await request(ctx!.app)
      .post("/api/v1/auth/register")
      .send({
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
        password: "Str0ng-Pass!",
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });

  it("POST /auth/login returns tokens", async () => {
    const res = await request(ctx!.app)
      .post("/api/v1/auth/login")
      .send({ email: "ada@example.com", password: "Str0ng-Pass!" });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBe("access-tok");
  });

  it("POST /auth/login maps invalid credentials to 401", async () => {
    auth0Api.loginWithPassword.mockRejectedValueOnce(
      new UnauthorizedError("Invalid email or password")
    );

    const res = await request(ctx!.app)
      .post("/api/v1/auth/login")
      .send({ email: "ada@example.com", password: "wrong" });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("POST /auth/forgot-password always returns generic success", async () => {
    auth0Api.requestPasswordChange.mockRejectedValueOnce(
      new Error("unknown email")
    );

    const res = await request(ctx!.app)
      .post("/api/v1/auth/forgot-password")
      .send({ email: "nobody@example.com" });

    expect(res.status).toBe(200);
    expect(res.body.data.message).toMatch(/if an account exists/i);
  });

  it("POST /auth/refresh returns new tokens", async () => {
    const res = await request(ctx!.app)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: "refresh-tok" });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBe("access-tok");
    expect(auth0Api.refresh).toHaveBeenCalledWith("refresh-tok");
  });

  it("rejects invalid register bodies", async () => {
    const res = await request(ctx!.app)
      .post("/api/v1/auth/register")
      .send({ email: "not-an-email", password: "x" });

    expect(res.status).toBe(400);
  });
});

describe("Auth0AuthenticationApi client", () => {
  it("posts password-realm grant and maps tokens", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: "a",
          refresh_token: "r",
          expires_in: 100,
          token_type: "Bearer",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const api = new Auth0AuthenticationApi({
      domain: "example.auth0.com",
      audience: "https://api.example.local",
      dbConnection: "Username-Password-Authentication",
      spaClientId: "spa",
      ropgClientId: "ropg",
      ropgClientSecret: "secret",
      fetchFn: fetchFn as unknown as typeof fetch,
    });

    const tokens = await api.loginWithPassword("a@b.com", "pass");
    expect(tokens.accessToken).toBe("a");
    expect(fetchFn).toHaveBeenCalledWith(
      "https://example.auth0.com/oauth/token",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("maps user_exists on signup to ConflictError", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ code: "user_exists", description: "exists" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    );

    const api = new Auth0AuthenticationApi({
      domain: "example.auth0.com",
      audience: "https://api.example.local",
      dbConnection: "Username-Password-Authentication",
      spaClientId: "spa",
      ropgClientId: "ropg",
      ropgClientSecret: "secret",
      fetchFn: fetchFn as unknown as typeof fetch,
    });

    await expect(
      api.signup({ email: "a@b.com", password: "Str0ng-Pass!" })
    ).rejects.toMatchObject({ statusCode: 409, code: "CONFLICT" });
  });

  it("maps password strength object description to a readable message", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          name: "PasswordStrengthError",
          code: "invalid_password",
          description: {
            rules: [
              {
                message: "At least %d characters in length",
                format: [15],
                code: "lengthAtLeast",
                verified: false,
              },
              {
                message: "Maximum password length exceeded",
                code: "maxLength",
                format: [72],
                verified: true,
              },
            ],
            verified: false,
          },
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    );

    const api = new Auth0AuthenticationApi({
      domain: "example.auth0.com",
      audience: "https://api.example.local",
      dbConnection: "Username-Password-Authentication",
      spaClientId: "spa",
      ropgClientId: "ropg",
      ropgClientSecret: "secret",
      fetchFn: fetchFn as unknown as typeof fetch,
    });

    await expect(
      api.signup({ email: "a@b.com", password: "short" })
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "VALIDATION_ERROR",
      message:
        "Password does not meet requirements: At least 15 characters in length",
    });
  });
});
