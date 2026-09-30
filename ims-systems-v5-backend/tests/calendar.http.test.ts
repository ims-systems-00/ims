import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createTestApp, type TestContext } from "./helpers/create-test-app";
import { getCalendarEventModel } from "../src/modules/calendar/repositories/calendar-event.model";
import { DEV_STUB_ORGANIZATION_ID } from "../src/security";

const otherOrgId = "000000000000000000000099";

describe("Calendar HTTP", () => {
  let ctx: TestContext | undefined;

  beforeAll(async () => {
    ctx = await createTestApp();
  }, 60_000);

  afterAll(async () => {
    if (ctx) {
      await ctx.cleanup();
    }
  });

  beforeEach(async () => {
    await getCalendarEventModel().deleteMany({});
  });

  const createPayload = {
    title: "Board briefing",
    start: "2026-09-10T09:00:00.000Z",
    end: "2026-09-10T10:00:00.000Z",
    description: "Monthly board briefing",
  };

  it("POST /api/v1/calendar creates a standalone event", async () => {
    const response = await request(ctx!.app)
      .post("/api/v1/calendar")
      .send(createPayload);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      title: createPayload.title,
      organizationId: DEV_STUB_ORGANIZATION_ID,
      color: "default",
      systemEventId: null,
      eventReference: null,
      reference: "",
    });
  });

  it("POST rejects missing title and invalid ranges", async () => {
    const missing = await request(ctx!.app)
      .post("/api/v1/calendar")
      .send({
        start: createPayload.start,
        end: createPayload.end,
      });
    expect(missing.status).toBe(400);
    expect(missing.body.error.code).toBe("VALIDATION_ERROR");

    const badRange = await request(ctx!.app)
      .post("/api/v1/calendar")
      .send({
        title: "Bad",
        start: "2026-09-10T12:00:00.000Z",
        end: "2026-09-10T10:00:00.000Z",
      });
    expect(badRange.status).toBe(400);
  });

  it("GET list supports search, date range, and pagination", async () => {
    await request(ctx!.app).post("/api/v1/calendar").send(createPayload);
    await request(ctx!.app)
      .post("/api/v1/calendar")
      .send({
        title: "Office move",
        start: "2026-10-01T08:00:00.000Z",
        end: "2026-10-01T17:00:00.000Z",
        description: "Furniture delivery",
      });

    const listed = await request(ctx!.app).get("/api/v1/calendar").query({
      search: "board",
      page: 1,
      pageSize: 10,
    });
    expect(listed.status).toBe(200);
    expect(listed.body.data.total).toBe(1);
    expect(listed.body.data.items[0].title).toContain("Board");

    const ranged = await request(ctx!.app).get("/api/v1/calendar").query({
      from: "2026-09-01T00:00:00.000Z",
      to: "2026-09-30T23:59:59.000Z",
    });
    expect(ranged.status).toBe(200);
    expect(ranged.body.data.total).toBe(1);
    expect(ranged.body.data.items[0].title).toBe("Board briefing");
  });

  it("enforces organisation isolation on get by id", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/calendar")
      .send(createPayload);
    const id = created.body.data.id as string;

    await getCalendarEventModel().updateOne(
      { _id: id },
      { $set: { organizationId: otherOrgId } }
    );

    const response = await request(ctx!.app).get(`/api/v1/calendar/${id}`);
    expect(response.status).toBe(404);
  });

  it("updates and soft-deletes standalone events", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/calendar")
      .send(createPayload);
    const id = created.body.data.id as string;

    const updated = await request(ctx!.app)
      .patch(`/api/v1/calendar/${id}`)
      .send({ title: "Board briefing (revised)" });
    expect(updated.status).toBe(200);
    expect(updated.body.data.title).toBe("Board briefing (revised)");

    const deleted = await request(ctx!.app).delete(`/api/v1/calendar/${id}`);
    expect(deleted.status).toBe(200);

    const listed = await request(ctx!.app).get("/api/v1/calendar");
    expect(listed.body.data.total).toBe(0);

    const getDeleted = await request(ctx!.app).get(`/api/v1/calendar/${id}`);
    expect(getDeleted.status).toBe(404);
  });

  it("rejects HTTP mutation of linked system events", async () => {
    const doc = await getCalendarEventModel().create({
      organizationId: DEV_STUB_ORGANIZATION_ID,
      reference: "",
      title: "P1 outage",
      description: "Incident",
      start: new Date("2026-09-12T08:00:00.000Z"),
      end: new Date("2026-09-12T08:00:00.000Z"),
      color: "red",
      systemEventId: "dddddddddddddddddddddddd",
      eventReference: "incident",
      attendeeIds: [],
      groupIds: [],
      createdBy: "system:incidents",
      createdOn: new Date(),
      deletedAt: null,
    });
    const id = String(doc._id);

    const patched = await request(ctx!.app)
      .patch(`/api/v1/calendar/${id}`)
      .send({ title: "Hacked" });
    expect(patched.status).toBe(409);

    const deleted = await request(ctx!.app).delete(`/api/v1/calendar/${id}`);
    expect(deleted.status).toBe(409);

    const listed = await request(ctx!.app).get("/api/v1/calendar");
    expect(listed.body.data.total).toBe(1);
  });

  it("creates linked task calendar events via task module", async () => {
    const task = await request(ctx!.app)
      .post("/api/v1/tasks")
      .send({
        name: "Prepare audit pack",
        description: "Gather evidence",
        dueDate: "2026-09-20T17:00:00.000Z",
        priority: "High",
        teamPriority: false,
        assigneeIds: [],
      });
    expect(task.status).toBe(201);
    const taskId = task.body.data.id as string;

    const listed = await request(ctx!.app).get("/api/v1/calendar").query({
      eventReferences: "task",
    });
    expect(listed.status).toBe(200);
    expect(listed.body.data.total).toBeGreaterThanOrEqual(1);
    const linked = listed.body.data.items.find(
      (item: { systemEventId: string | null }) => item.systemEventId === taskId
    );
    expect(linked).toMatchObject({
      eventReference: "task",
      color: "default",
      title: expect.stringContaining("(Task manager)"),
    });

    await request(ctx!.app).delete(`/api/v1/tasks/${taskId}`);

    const afterDelete = await request(ctx!.app).get("/api/v1/calendar").query({
      eventReferences: "task",
    });
    const stillThere = afterDelete.body.data.items.find(
      (item: { systemEventId: string | null }) => item.systemEventId === taskId
    );
    expect(stillThere).toBeUndefined();
  });
});
