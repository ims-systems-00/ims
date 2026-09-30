import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createTestApp, type TestContext } from "./helpers/create-test-app";
import { getManagementReviewModel } from "../src/modules/management-reviews/repositories/management-review.model";
import { DEV_STUB_ORGANIZATION_ID } from "../src/security";

const otherOrgId = "000000000000000000000099";

describe("Management Reviews HTTP", () => {
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
    await getManagementReviewModel().deleteMany({});
  });

  const createPayload = {
    title: "Q1 leadership review",
    date: new Date(Date.now() - 86_400_000).toISOString(),
    interval: "Yearly",
    time: "10:00",
    attendees: ["bbbbbbbbbbbbbbbbbbbbbbbb"],
  };

  it("POST /api/v1/management-reviews schedules a review", async () => {
    const response = await request(ctx!.app)
      .post("/api/v1/management-reviews")
      .send(createPayload);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.items).toHaveLength(1);
    expect(response.body.data.items[0]).toMatchObject({
      title: "Q1 leadership review",
      organizationId: DEV_STUB_ORGANIZATION_ID,
      displayStatus: "Scheduled",
      interval: "Yearly",
      privacy: "Organisational",
    });
    expect(response.body.data.items[0].reference).toMatch(/^MR-/);
  });

  it("POST schedules four quarterly reviews", async () => {
    const response = await request(ctx!.app)
      .post("/api/v1/management-reviews")
      .send({ ...createPayload, interval: "Quarterly" });

    expect(response.status).toBe(201);
    expect(response.body.data.items).toHaveLength(4);
  });

  it("POST rejects missing required fields", async () => {
    const missing = await request(ctx!.app)
      .post("/api/v1/management-reviews")
      .send({ title: "Only title" });
    expect(missing.status).toBe(400);
    expect(missing.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("POST requires businessUnitId for Business unit privacy", async () => {
    const response = await request(ctx!.app)
      .post("/api/v1/management-reviews")
      .send({
        ...createPayload,
        privacy: "Business unit",
      });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("GET list supports search, status, and pagination", async () => {
    await request(ctx!.app)
      .post("/api/v1/management-reviews")
      .send(createPayload);
    await request(ctx!.app)
      .post("/api/v1/management-reviews")
      .send({
        ...createPayload,
        title: "Annual board management review",
        interval: "Yearly",
      });

    const listed = await request(ctx!.app)
      .get("/api/v1/management-reviews")
      .query({
        search: "leadership",
        page: 1,
        pageSize: 10,
      });
    expect(listed.status).toBe(200);
    expect(listed.body.data.total).toBe(1);
    expect(listed.body.data.items[0].title).toBe("Q1 leadership review");

    const filtered = await request(ctx!.app)
      .get("/api/v1/management-reviews")
      .query({ status: "Scheduled" });
    expect(filtered.status).toBe(200);
    expect(filtered.body.data.total).toBe(2);
  });

  it("enforces organisation isolation on get by id", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/management-reviews")
      .send(createPayload);
    const id = created.body.data.items[0].id as string;

    await getManagementReviewModel().updateOne(
      { _id: id },
      { $set: { organizationId: otherOrgId } }
    );

    const response = await request(ctx!.app).get(
      `/api/v1/management-reviews/${id}`
    );
    expect(response.status).toBe(404);
  });

  it("supports agenda/minutes/attendees then complete", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/management-reviews")
      .send(createPayload);
    const id = created.body.data.items[0].id as string;

    const agenda = await request(ctx!.app)
      .post(`/api/v1/management-reviews/${id}/agenda`)
      .send({
        attachments: [{ fileName: "agenda.pdf", mimeType: "application/pdf" }],
      });
    expect(agenda.status).toBe(201);
    expect(agenda.body.data.agenda).toHaveLength(1);
    const agendaId = agenda.body.data.agenda[0].id as string;

    const minutes = await request(ctx!.app)
      .post(`/api/v1/management-reviews/${id}/minutes`)
      .send({
        attachments: [{ fileName: "minutes.pdf" }],
      });
    expect(minutes.status).toBe(201);
    expect(minutes.body.data.minutes).toHaveLength(1);

    const attendee = await request(ctx!.app)
      .post(`/api/v1/management-reviews/${id}/attendees`)
      .send({ attendeeId: "cccccccccccccccccccccccc" });
    expect(attendee.status).toBe(200);
    expect(attendee.body.data.attendees).toContain("cccccccccccccccccccccccc");

    const completed = await request(ctx!.app).post(
      `/api/v1/management-reviews/${id}/complete`
    );
    expect(completed.status).toBe(200);
    expect(completed.body.data.displayStatus).toBe("Completed");
    expect(completed.body.data.completed.status).toBe(true);

    const blockedUpdate = await request(ctx!.app)
      .patch(`/api/v1/management-reviews/${id}`)
      .send({ title: "Should not update" });
    expect(blockedUpdate.status).toBe(409);

    const blockedAgenda = await request(ctx!.app)
      .delete(`/api/v1/management-reviews/${id}/agenda/${agendaId}`);
    expect(blockedAgenda.status).toBe(409);

    const blockedDelete = await request(ctx!.app).delete(
      `/api/v1/management-reviews/${id}`
    );
    expect(blockedDelete.status).toBe(409);
  });

  it("blocks completion before schedule date", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/management-reviews")
      .send({
        ...createPayload,
        date: new Date(Date.now() + 7 * 86_400_000).toISOString(),
      });
    const id = created.body.data.items[0].id as string;

    const response = await request(ctx!.app).post(
      `/api/v1/management-reviews/${id}/complete`
    );
    expect(response.status).toBe(409);
  });

  it("soft-deletes a scheduled review", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/management-reviews")
      .send(createPayload);
    const id = created.body.data.items[0].id as string;

    const deleted = await request(ctx!.app).delete(
      `/api/v1/management-reviews/${id}`
    );
    expect(deleted.status).toBe(200);

    const listed = await request(ctx!.app).get("/api/v1/management-reviews");
    expect(listed.body.data.total).toBe(0);

    const get = await request(ctx!.app).get(
      `/api/v1/management-reviews/${id}`
    );
    expect(get.status).toBe(404);
  });

  it("GET /stats returns aggregates", async () => {
    await request(ctx!.app)
      .post("/api/v1/management-reviews")
      .send(createPayload);
    const stats = await request(ctx!.app).get(
      "/api/v1/management-reviews/stats"
    );
    expect(stats.status).toBe(200);
    expect(stats.body.data.total).toBeGreaterThanOrEqual(1);
    expect(stats.body.data.scheduled).toBeGreaterThanOrEqual(1);
  });

  it("rejects invalid id format", async () => {
    const response = await request(ctx!.app).get(
      "/api/v1/management-reviews/not-an-id"
    );
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });
});
