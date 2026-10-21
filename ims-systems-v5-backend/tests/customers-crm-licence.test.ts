import express from "express";
import mongoose from "mongoose";
import request from "supertest";
import { describe, expect, it } from "vitest";

// Fail fast instead of buffering when no Mongo connection exists (unit test).
mongoose.set("bufferCommands", false);
import { createCustomerRouter } from "../src/modules/customers/routes/customer.routes";
import { DEV_STUB_IDENTITY } from "../src/security";

function buildApp(isCrmLicensed: boolean) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as express.Request & { identity: typeof DEV_STUB_IDENTITY }).identity =
      DEV_STUB_IDENTITY;
    next();
  });
  app.use(
    "/customers",
    createCustomerRouter({
      authorizer: {} as never,
      licences: { isCrmLicensed: async () => isCrmLicensed },
    })
  );
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use(
    (
      error: Error & { statusCode?: number; code?: string },
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      res
        .status(error.statusCode ?? 500)
        .json({ success: false, error: { code: error.code ?? "ERROR" } });
    }
  );
  return app;
}

describe("Customers CRM licence gate", () => {
  it("blocks CRM routes when the organisation has no CRM licence", async () => {
    const response = await request(buildApp(false)).get("/customers");
    expect(response.status).toBe(403);
  });

  it("does not block at the licence gate when CRM is licensed", async () => {
    const response = await request(buildApp(true)).get("/customers");
    // Licensed requests pass the gate; downstream (no DB in unit test)
    // may fail, but must not be the 403 licence rejection.
    expect(response.status).not.toBe(403);
  });
});
