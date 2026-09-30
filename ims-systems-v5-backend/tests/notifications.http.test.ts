import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createTestApp, type TestContext } from "./helpers/create-test-app";
import { getNotificationModel } from "../src/modules/notifications/repositories/notification.model";
import { DEV_STUB_IDENTITY, DEV_STUB_ORGANIZATION_ID } from "../src/security";

const otherOrgId = "000000000000000000000099";
const otherUserId = "other-user-subject";

describe("Notifications HTTP", () => {
  let ctx: TestContext | undefined;

  beforeAll(async () => {
    ctx = await createTestApp();
  }, 60_000);

  afterAll(async () => {
    if (ctx) await ctx.cleanup();
  });

  beforeEach(async () => {
    await getNotificationModel().deleteMany({});
  });

  async function seedMine(overrides: Record<string, unknown> = {}) {
    return getNotificationModel().create({
      organizationId: DEV_STUB_ORGANIZATION_ID,
      recipientUserId: DEV_STUB_IDENTITY.subjectId,
      title: "Risk management",
      message: "Assigned to you",
      referenceType: "risks",
      referenceModuleId: "bbbbbbbbbbbbbbbbbbbbbbbb",
      screenIdentifier: "risk-detail",
      params: { id: "bbbbbbbbbbbbbbbbbbbbbbbb", businessUnitId: null },
      sent: { status: "unsent", on: null },
      read: { status: "unread", on: null },
      popUp: { status: "read", on: null },
      isOrganizational: false,
      createdBy: "system",
      createdOn: new Date(),
      ...overrides,
    });
  }

  it("GET /api/v1/notifications returns personal list", async () => {
    await seedMine();
    await seedMine({
      recipientUserId: otherUserId,
      message: "Other user only",
    });

    const response = await request(ctx!.app).get("/api/v1/notifications");
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.total).toBe(1);
    expect(response.body.data.items[0].message).toBe("Assigned to you");
    expect(response.body.data.items[0].recipientUserId).toBe(
      DEV_STUB_IDENTITY.subjectId
    );
  });

  it("enforces organisation isolation", async () => {
    await seedMine({
      organizationId: otherOrgId,
      message: "Other org",
    });
    await seedMine({ message: "Mine" });

    const response = await request(ctx!.app).get("/api/v1/notifications");
    expect(response.status).toBe(200);
    expect(response.body.data.total).toBe(1);
    expect(response.body.data.items[0].message).toBe("Mine");
  });

  it("GET unsent-count returns badge count", async () => {
    await seedMine({ sent: { status: "unsent", on: null } });
    await seedMine({
      message: "Already seen",
      sent: { status: "sent", on: new Date() },
    });

    const response = await request(ctx!.app).get(
      "/api/v1/notifications/unsent-count"
    );
    expect(response.status).toBe(200);
    expect(response.body.data.count).toBe(1);
  });

  it("PATCH /sent marks all unsent as sent for current user only", async () => {
    await seedMine();
    await seedMine({
      recipientUserId: otherUserId,
      message: "Other unsent",
    });

    const response = await request(ctx!.app).patch(
      "/api/v1/notifications/sent"
    );
    expect(response.status).toBe(200);
    expect(response.body.data.modifiedCount).toBe(1);

    const mine = await getNotificationModel().find({
      recipientUserId: DEV_STUB_IDENTITY.subjectId,
    });
    expect(mine.every((n) => n.sent.status === "sent")).toBe(true);

    const other = await getNotificationModel().findOne({
      recipientUserId: otherUserId,
    });
    expect(other?.sent.status).toBe("unsent");
  });

  it("PATCH /:id/read marks notification read", async () => {
    const doc = await seedMine();
    const response = await request(ctx!.app).patch(
      `/api/v1/notifications/${String(doc._id)}/read`
    );
    expect(response.status).toBe(200);
    expect(response.body.data.read.status).toBe("read");
    expect(response.body.data.read.on).toBeTruthy();
  });

  it("cannot read another user's notification by id", async () => {
    const doc = await seedMine({ recipientUserId: otherUserId });
    const response = await request(ctx!.app).get(
      `/api/v1/notifications/${String(doc._id)}`
    );
    expect(response.status).toBe(404);
  });

  it("cannot mark another user's notification as read", async () => {
    const doc = await seedMine({ recipientUserId: otherUserId });
    const response = await request(ctx!.app).patch(
      `/api/v1/notifications/${String(doc._id)}/read`
    );
    expect(response.status).toBe(404);
  });

  it("PATCH /popup marks all pending popups read", async () => {
    await seedMine({
      popUp: { status: "unread", on: new Date() },
      message: "Popup one",
    });
    await seedMine({
      popUp: { status: "unread", on: new Date() },
      message: "Popup two",
    });

    const response = await request(ctx!.app).patch(
      "/api/v1/notifications/popup"
    );
    expect(response.status).toBe(200);
    expect(response.body.data.modifiedCount).toBe(2);

    const remaining = await getNotificationModel().countDocuments({
      recipientUserId: DEV_STUB_IDENTITY.subjectId,
      "popUp.status": "unread",
    });
    expect(remaining).toBe(0);
  });

  it("rejects invalid broadcast message length", async () => {
    const response = await request(ctx!.app)
      .post("/api/v1/notifications/broadcast")
      .send({ message: "x".repeat(151) });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects invalid notification id", async () => {
    const response = await request(ctx!.app).get(
      "/api/v1/notifications/not-an-id"
    );
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("supports pagination and unread filter", async () => {
    for (let i = 0; i < 3; i += 1) {
      await seedMine({
        message: `Item ${i}`,
        createdOn: new Date(Date.now() - i * 1000),
        read: {
          status: i === 0 ? "read" : "unread",
          on: i === 0 ? new Date() : null,
        },
      });
    }

    const response = await request(ctx!.app)
      .get("/api/v1/notifications")
      .query({ page: 1, pageSize: 2, read: "unread" });
    expect(response.status).toBe(200);
    expect(response.body.data.pageSize).toBe(2);
    expect(response.body.data.total).toBe(2);
    expect(
      response.body.data.items.every(
        (item: { read: { status: string } }) => item.read.status === "unread"
      )
    ).toBe(true);
  });
});
