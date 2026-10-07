import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createTestApp, type TestContext } from "./helpers/create-test-app";

describe("Report Bug HTTP", () => {
  let ctx: TestContext | undefined;

  beforeAll(async () => {
    ctx = await createTestApp({
      EMAIL_ENABLED: "true",
      EMAIL_PROVIDER: "logging",
      EMAIL_QUEUE_ENABLED: "false",
      REPORT_BUG_SUPPORT_EMAILS: "support@example.local",
    });
  }, 60_000);

  afterAll(async () => {
    if (ctx) await ctx.cleanup();
  });

  it("POST /api/v1/report-bug accepts a valid report", async () => {
    const sendSpy = vi.spyOn(ctx!.app.locals.email!, "sendTransactional");

    const response = await request(ctx!.app)
      .post("/api/v1/report-bug")
      .send({
        category: "Bug",
        title: "Dashboard chart blank",
        description: "Opening Live Dashboard shows an empty chart panel.",
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      accepted: true,
      category: "Bug",
      title: "Dashboard chart blank",
      emailed: true,
    });
    expect(sendSpy).toHaveBeenCalledTimes(2);
    expect(sendSpy).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        to: ["support@example.local"],
        category: "system",
      })
    );
    expect(sendSpy).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        to: "dev-stub@example.local",
        category: "transactional",
      })
    );
  });

  it("rejects short titles", async () => {
    const response = await request(ctx!.app)
      .post("/api/v1/report-bug")
      .send({
        category: "Bug",
        title: "Short",
        description: "Not enough title length.",
      });
    expect(response.status).toBe(400);
  });

  it("rejects unknown categories", async () => {
    const response = await request(ctx!.app)
      .post("/api/v1/report-bug")
      .send({
        category: "NotACategory",
        title: "Something went wrong",
        description: "Details here.",
      });
    expect(response.status).toBe(400);
  });
});
