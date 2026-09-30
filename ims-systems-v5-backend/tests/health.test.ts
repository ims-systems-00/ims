import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { Router } from "express";
import { createTestApp, type TestContext } from "./helpers/create-test-app";
import { createApp } from "../src/app/create-app";
import { createLogger } from "../src/infrastructure/logging/logger";
import { AppError } from "../src/shared/errors/app-error";
import { parseWithSchema } from "../src/shared/validation/parse";
import { z } from "zod";
import { DEV_STUB_IDENTITY } from "../src/security";
import { sendSuccess } from "../src/shared/http/response";

describe("HTTP platform", () => {
  let ctx: TestContext | undefined;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    if (ctx) {
      await ctx.cleanup();
    }
  });

  it("composes an Express application", () => {
    expect(ctx.app).toBeTruthy();
    expect(typeof ctx.app.handle).toBe("function");
  });

  it("GET /api/v1/health returns 200 when MongoDB is connected", async () => {
    const response = await request(ctx!.app).get("/api/v1/health");
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe("ok");
    expect(response.body.data.checks.database).toBe("up");
    expect(response.headers["x-correlation-id"]).toBeTruthy();
    expect(response.body.correlationId).toBe(
      response.headers["x-correlation-id"]
    );
  });

  it("answers browser CORS preflight for the Vite origin", async () => {
    const response = await request(ctx!.app)
      .options("/api/v1/health")
      .set("Origin", "http://127.0.0.1:3000")
      .set("Access-Control-Request-Method", "GET");

    expect(response.status).toBe(204);
    expect(response.headers["access-control-allow-origin"]).toBe(
      "http://127.0.0.1:3000"
    );
    expect(response.headers["access-control-allow-methods"]).toMatch(/GET/);
  });

  it("propagates inbound correlation id", async () => {
    const response = await request(ctx!.app)
      .get("/api/v1/health")
      .set("x-correlation-id", "test-correlation-123");
    expect(response.headers["x-correlation-id"]).toBe("test-correlation-123");
    expect(response.body.correlationId).toBe("test-correlation-123");
  });

  it("returns 404 for unknown routes", async () => {
    const response = await request(ctx!.app).get("/api/v1/does-not-exist");
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });

  it("attaches development security identity via middleware", async () => {
    const probe = Router();
    probe.get("/__whoami", (req, res) => {
      sendSuccess(res, { identity: req.identity ?? null }, 200, req.correlationId);
    });

    const logger = createLogger({ level: "silent" });
    const { app } = createApp({
      config: ctx!.config,
      logger,
      mongo: ctx!.mongo,
      additionalV1Routers: [probe],
    });

    const response = await request(app).get("/api/v1/__whoami");
    expect(response.status).toBe(200);
    expect(response.body.data.identity).toEqual(DEV_STUB_IDENTITY);
  });
});

describe("centralized error handling", () => {
  let ctx: TestContext | undefined;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    if (ctx) {
      await ctx.cleanup();
    }
  });

  it("returns validation errors from parseWithSchema", () => {
    expect(() =>
      parseWithSchema(z.object({ name: z.string().min(1) }), { name: "" })
    ).toThrow(/Validation failed/);
  });

  it("maps thrown AppError to a consistent JSON error body", async () => {
    const probe = Router();
    probe.get("/__error", (_req, _res, next) => {
      next(
        new AppError({
          message: "Controlled failure",
          statusCode: 400,
          code: "CONTROLLED_ERROR",
        })
      );
    });

    const logger = createLogger({ level: "silent" });
    const { app } = createApp({
      config: ctx!.config,
      logger,
      mongo: ctx!.mongo,
      additionalV1Routers: [probe],
    });

    const response = await request(app).get("/api/v1/__error");
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: "CONTROLLED_ERROR",
        message: "Controlled failure",
      },
    });
  });

  it("maps unexpected errors to INTERNAL_ERROR without leaking details", async () => {
    const probe = Router();
    probe.get("/__boom", () => {
      throw new Error("secret stack stuff");
    });

    const logger = createLogger({ level: "silent" });
    const { app } = createApp({
      config: ctx!.config,
      logger,
      mongo: ctx!.mongo,
      additionalV1Routers: [probe],
    });

    const response = await request(app).get("/api/v1/__boom");
    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("INTERNAL_ERROR");
    expect(response.body.error.message).toBe("Internal server error");
    expect(JSON.stringify(response.body)).not.toContain("secret stack stuff");
  });
});
