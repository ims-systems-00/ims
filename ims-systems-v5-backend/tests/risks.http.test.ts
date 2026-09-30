import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createTestApp, type TestContext } from "./helpers/create-test-app";
import { getRiskModel } from "../src/modules/risks/repositories/risk.model";
import { DEV_STUB_ORGANIZATION_ID } from "../src/security";

const otherOrgId = "000000000000000000000099";

describe("Risks HTTP", () => {
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
    await getRiskModel().deleteMany({});
  });

  const createPayload = {
    title: "Unpatched server",
    description: "Critical server missing security patches",
    type: "Hardware",
    likelihood: 3,
    consequence: 4,
    ownerId: "bbbbbbbbbbbbbbbbbbbbbbbb",
  };

  it("POST /api/v1/risks creates a risk", async () => {
    const response = await request(ctx!.app)
      .post("/api/v1/risks")
      .send(createPayload);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      title: "Unpatched server",
      type: "Hardware",
      organizationId: DEV_STUB_ORGANIZATION_ID,
      displayStatus: "Open",
      currentScore: { likelihood: 3, consequence: 4, total: 12 },
      initialScore: { likelihood: 3, consequence: 4, total: 12 },
      scoreBand: "medium",
    });
    expect(response.body.data.reference).toMatch(/^RK-/);
  });

  it("POST rejects invalid score and missing fields", async () => {
    const missing = await request(ctx!.app)
      .post("/api/v1/risks")
      .send({ title: "Only title" });
    expect(missing.status).toBe(400);
    expect(missing.body.error.code).toBe("VALIDATION_ERROR");

    const badScore = await request(ctx!.app)
      .post("/api/v1/risks")
      .send({ ...createPayload, likelihood: 9 });
    expect(badScore.status).toBe(400);
  });

  it("GET list supports search, filter, and pagination", async () => {
    await request(ctx!.app).post("/api/v1/risks").send(createPayload);
    await request(ctx!.app)
      .post("/api/v1/risks")
      .send({
        ...createPayload,
        title: "People risk",
        type: "People",
        likelihood: 1,
        consequence: 1,
      });

    const listed = await request(ctx!.app).get("/api/v1/risks").query({
      search: "Unpatched",
      page: 1,
      pageSize: 10,
    });
    expect(listed.status).toBe(200);
    expect(listed.body.data.total).toBe(1);
    expect(listed.body.data.items[0].title).toBe("Unpatched server");

    const filtered = await request(ctx!.app).get("/api/v1/risks").query({
      types: "People",
      status: "Open",
    });
    expect(filtered.status).toBe(200);
    expect(filtered.body.data.total).toBe(1);
    expect(filtered.body.data.items[0].type).toBe("People");
  });

  it("PATCH updates current score and preserves initial score", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/risks")
      .send(createPayload);
    const id = created.body.data.id as string;

    const updated = await request(ctx!.app)
      .patch(`/api/v1/risks/${id}`)
      .send({ likelihood: 5, consequence: 5 });

    expect(updated.status).toBe(200);
    expect(updated.body.data.initialScore.total).toBe(12);
    expect(updated.body.data.currentScore.total).toBe(25);
    expect(updated.body.data.scoreBand).toBe("high");
  });

  it("mitigate locks further updates and escalation", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/risks")
      .send(createPayload);
    const id = created.body.data.id as string;

    const mitigated = await request(ctx!.app)
      .post(`/api/v1/risks/${id}/mitigate`)
      .send({ mitigationText: "Patched and monitored" });
    expect(mitigated.status).toBe(200);
    expect(mitigated.body.data.displayStatus).toBe("Mitigated");
    expect(mitigated.body.data.mitigated.status).toBe(true);

    const updateBlocked = await request(ctx!.app)
      .patch(`/api/v1/risks/${id}`)
      .send({ title: "Should fail" });
    expect(updateBlocked.status).toBe(409);

    const escalateBlocked = await request(ctx!.app).post(
      `/api/v1/risks/${id}/escalate`
    );
    expect(escalateBlocked.status).toBe(409);
  });

  it("accept and escalate domain operations", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/risks")
      .send(createPayload);
    const id = created.body.data.id as string;

    const accepted = await request(ctx!.app)
      .post(`/api/v1/risks/${id}/accept`)
      .send({
        acceptanceRationale: "Within appetite",
        decisionMaker: "HoS",
      });
    expect(accepted.status).toBe(200);
    expect(accepted.body.data.displayStatus).toBe("Accepted");

    const escalated = await request(ctx!.app).post(
      `/api/v1/risks/${id}/escalate`
    );
    expect(escalated.status).toBe(200);
    expect(escalated.body.data.escalated.status).toBe(true);

    const reEscalate = await request(ctx!.app).post(
      `/api/v1/risks/${id}/escalate`
    );
    expect(reEscalate.status).toBe(409);
  });

  it("nudge applies cooldown", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/risks")
      .send(createPayload);
    const id = created.body.data.id as string;

    const first = await request(ctx!.app).post(`/api/v1/risks/${id}/nudge`);
    expect(first.status).toBe(200);
    expect(first.body.data.nextNudgeAt).toBeTruthy();

    const second = await request(ctx!.app).post(`/api/v1/risks/${id}/nudge`);
    expect(second.status).toBe(409);
  });

  it("soft-deletes a risk and hides it from list/get", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/risks")
      .send(createPayload);
    const id = created.body.data.id as string;

    const deleted = await request(ctx!.app).delete(`/api/v1/risks/${id}`);
    expect(deleted.status).toBe(200);

    const listed = await request(ctx!.app).get("/api/v1/risks");
    expect(listed.body.data.total).toBe(0);

    const got = await request(ctx!.app).get(`/api/v1/risks/${id}`);
    expect(got.status).toBe(404);
  });

  it("enforces organisation isolation on get/update/delete", async () => {
    const model = getRiskModel();
    const foreign = await model.create({
      organizationId: otherOrgId,
      reference: "RK-FOREIGN-1",
      title: "Other org risk",
      description: "Should not be visible",
      type: "Hardware",
      initialScore: { likelihood: 1, consequence: 1, total: 1 },
      currentScore: { likelihood: 1, consequence: 1, total: 1 },
      raisedBy: "other-user",
      raisedOn: new Date(),
      deletedAt: null,
    });

    const id = String(foreign._id);

    const got = await request(ctx!.app).get(`/api/v1/risks/${id}`);
    expect(got.status).toBe(404);

    const patched = await request(ctx!.app)
      .patch(`/api/v1/risks/${id}`)
      .send({ title: "Hijack" });
    expect(patched.status).toBe(404);

    const removed = await request(ctx!.app).delete(`/api/v1/risks/${id}`);
    expect(removed.status).toBe(404);

    const stillThere = await model.findById(id).exec();
    expect(stillThere).toBeTruthy();
    expect(stillThere!.title).toBe("Other org risk");
  });

  it("sets compliance links and returns stats/report", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/risks")
      .send(createPayload);
    const id = created.body.data.id as string;

    const linked = await request(ctx!.app)
      .put(`/api/v1/risks/${id}/compliance-links`)
      .send({
        links: [{ toolkitId: "iso27001", clauseIds: ["A.5.1", "A.8.1"] }],
      });
    expect(linked.status).toBe(200);
    expect(linked.body.data.complianceLinks).toHaveLength(1);

    const stats = await request(ctx!.app).get("/api/v1/risks/stats");
    expect(stats.status).toBe(200);
    expect(stats.body.data.total).toBe(1);
    expect(stats.body.data.open).toBe(1);

    const report = await request(ctx!.app).get("/api/v1/risks/report");
    expect(report.status).toBe(200);
    expect(report.headers["content-type"]).toMatch(/text\/csv/);
    expect(report.text).toContain("reference");
    expect(report.text).toContain("Unpatched server");
  });

  it("update path can mark mitigated with text", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/risks")
      .send(createPayload);
    const id = created.body.data.id as string;

    const updated = await request(ctx!.app)
      .patch(`/api/v1/risks/${id}`)
      .send({
        mitigated: true,
        mitigationText: "Mitigated via update form",
      });

    expect(updated.status).toBe(200);
    expect(updated.body.data.displayStatus).toBe("Mitigated");
    expect(updated.body.data.mitigated.by).toBeTruthy();
  });
});
