import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createTestApp, type TestContext } from "./helpers/create-test-app";
import { getIncidentModel } from "../src/modules/incidents/repositories/incident.model";
import { DEV_STUB_ORGANIZATION_ID } from "../src/security";

const otherOrgId = "000000000000000000000099";

describe("Incidents HTTP", () => {
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
    await getIncidentModel().deleteMany({});
  });

  const createPayload = {
    title: "Server room water leak",
    description: "Water detected under cooling unit in DC cage",
    priority: "P2",
    ownerId: "bbbbbbbbbbbbbbbbbbbbbbbb",
    businessUnitId: "cccccccccccccccccccccccc",
    methodOfNotification: "Email",
    affectedService: "Hosting",
  };

  it("POST /api/v1/incidents creates an incident", async () => {
    const response = await request(ctx!.app)
      .post("/api/v1/incidents")
      .send(createPayload);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      title: "Server room water leak",
      priority: "P2",
      organizationId: DEV_STUB_ORGANIZATION_ID,
      displayStatus: "Open",
      privacy: "Business unit",
    });
    expect(response.body.data.reference).toMatch(/^INC-/);
  });

  it("POST rejects missing title and description", async () => {
    const missing = await request(ctx!.app)
      .post("/api/v1/incidents")
      .send({ title: "Only title" });
    expect(missing.status).toBe(400);
    expect(missing.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("GET list supports search, filter, and pagination", async () => {
    await request(ctx!.app).post("/api/v1/incidents").send(createPayload);
    await request(ctx!.app)
      .post("/api/v1/incidents")
      .send({
        ...createPayload,
        title: "Phishing report from staff",
        description: "User reported suspicious email",
        priority: "P3",
      });

    const listed = await request(ctx!.app).get("/api/v1/incidents").query({
      search: "water",
      page: 1,
      pageSize: 10,
    });
    expect(listed.status).toBe(200);
    expect(listed.body.data.total).toBe(1);
    expect(listed.body.data.items[0].title).toBe("Server room water leak");

    const filtered = await request(ctx!.app).get("/api/v1/incidents").query({
      priorities: "P3",
      status: "Open",
    });
    expect(filtered.status).toBe(200);
    expect(filtered.body.data.total).toBe(1);
    expect(filtered.body.data.items[0].priority).toBe("P3");
  });

  it("excludes non-standalone sources from main list by default", async () => {
    await request(ctx!.app).post("/api/v1/incidents").send(createPayload);
    await request(ctx!.app)
      .post("/api/v1/incidents")
      .send({
        ...createPayload,
        title: "Audit non-conformity",
        description: "Promoted from completed audit",
        source: {
          moduleType: "audits",
          moduleId: "dddddddddddddddddddddddd",
        },
      });

    const listed = await request(ctx!.app).get("/api/v1/incidents");
    expect(listed.status).toBe(200);
    expect(listed.body.data.total).toBe(1);

    const auditScoped = await request(ctx!.app)
      .get("/api/v1/incidents")
      .query({
        sourceModuleType: "audits",
        sourceModuleId: "dddddddddddddddddddddddd",
      });
    expect(auditScoped.status).toBe(200);
    expect(auditScoped.body.data.total).toBe(1);
    expect(auditScoped.body.data.items[0].title).toBe("Audit non-conformity");
  });

  it("escalate then resolve locks further updates", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/incidents")
      .send(createPayload);
    const id = created.body.data.id as string;

    const escalated = await request(ctx!.app).post(
      `/api/v1/incidents/${id}/escalate`
    );
    expect(escalated.status).toBe(200);
    expect(escalated.body.data.displayStatus).toBe("Escalated");

    const reEscalate = await request(ctx!.app).post(
      `/api/v1/incidents/${id}/escalate`
    );
    expect(reEscalate.status).toBe(409);

    const resolved = await request(ctx!.app)
      .post(`/api/v1/incidents/${id}/resolve`)
      .send({ resolution: "Leak contained and floor dried" });
    expect(resolved.status).toBe(200);
    expect(resolved.body.data.displayStatus).toBe("Resolved");
    expect(resolved.body.data.resolutionTimeMs).toBeGreaterThanOrEqual(0);

    const updateBlocked = await request(ctx!.app)
      .patch(`/api/v1/incidents/${id}`)
      .send({ title: "Should fail" });
    expect(updateBlocked.status).toBe(409);

    const deleteBlocked = await request(ctx!.app).delete(
      `/api/v1/incidents/${id}`
    );
    expect(deleteBlocked.status).toBe(409);
  });

  it("resolves via update path", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/incidents")
      .send(createPayload);
    const id = created.body.data.id as string;

    const updated = await request(ctx!.app)
      .patch(`/api/v1/incidents/${id}`)
      .send({
        resolved: true,
        resolution: "Resolved through edit form",
      });

    expect(updated.status).toBe(200);
    expect(updated.body.data.displayStatus).toBe("Resolved");
    expect(updated.body.data.resolution).toBe("Resolved through edit form");
  });

  it("nudge applies cooldown", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/incidents")
      .send(createPayload);
    const id = created.body.data.id as string;

    const first = await request(ctx!.app).post(
      `/api/v1/incidents/${id}/nudge`
    );
    expect(first.status).toBe(200);
    expect(first.body.data.nextNudgeAt).toBeTruthy();

    const second = await request(ctx!.app).post(
      `/api/v1/incidents/${id}/nudge`
    );
    expect(second.status).toBe(409);
  });

  it("soft-deletes an incident and hides it from list/get", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/incidents")
      .send(createPayload);
    const id = created.body.data.id as string;

    const deleted = await request(ctx!.app).delete(`/api/v1/incidents/${id}`);
    expect(deleted.status).toBe(200);

    const listed = await request(ctx!.app).get("/api/v1/incidents");
    expect(listed.body.data.total).toBe(0);

    const got = await request(ctx!.app).get(`/api/v1/incidents/${id}`);
    expect(got.status).toBe(404);
  });

  it("enforces organisation isolation on get/update/delete", async () => {
    const model = getIncidentModel();
    const foreign = await model.create({
      organizationId: otherOrgId,
      reference: "INC-FOREIGN-1",
      title: "Other org incident",
      description: "Should not be visible",
      priority: "P4",
      privacy: "Business unit",
      raisedBy: "other-user",
      raisedOn: new Date(),
      deletedAt: null,
    });

    const id = String(foreign._id);

    const got = await request(ctx!.app).get(`/api/v1/incidents/${id}`);
    expect(got.status).toBe(404);

    const patched = await request(ctx!.app)
      .patch(`/api/v1/incidents/${id}`)
      .send({ title: "Hijack" });
    expect(patched.status).toBe(404);

    const removed = await request(ctx!.app).delete(`/api/v1/incidents/${id}`);
    expect(removed.status).toBe(404);

    const stillThere = await model.findById(id).exec();
    expect(stillThere).toBeTruthy();
    expect(stillThere!.title).toBe("Other org incident");
  });

  it("sets compliance links and returns stats/report", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/incidents")
      .send(createPayload);
    const id = created.body.data.id as string;

    const linked = await request(ctx!.app)
      .put(`/api/v1/incidents/${id}/compliance-links`)
      .send({
        links: [{ toolkitId: "iso27001", clauseIds: ["A.5.1", "A.8.1"] }],
      });
    expect(linked.status).toBe(200);
    expect(linked.body.data.complianceLinks).toHaveLength(1);

    const stats = await request(ctx!.app).get("/api/v1/incidents/stats");
    expect(stats.status).toBe(200);
    expect(stats.body.data.total).toBe(1);
    expect(stats.body.data.open).toBe(1);

    const report = await request(ctx!.app).get("/api/v1/incidents/report");
    expect(report.status).toBe(200);
    expect(report.headers["content-type"]).toMatch(/text\/csv/);
    expect(report.text).toContain("reference");
    expect(report.text).toContain("Server room water leak");
  });

  it("cascades soft-delete when incident with sourced tasks is deleted", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/incidents")
      .send(createPayload);
    const incidentId = created.body.data.id as string;

    const task = await request(ctx!.app)
      .post("/api/v1/tasks")
      .send({
        name: "Follow up on water leak",
        description: "Confirm containment",
        teamPriority: false,
        assigneeIds: ["dev-stub-user"],
        source: { moduleType: "incidents", moduleId: incidentId },
      });
    expect(task.status).toBe(201);
    const taskId = task.body.data.id as string;

    const deleted = await request(ctx!.app).delete(
      `/api/v1/incidents/${incidentId}`
    );
    expect(deleted.status).toBe(200);

    const gotTask = await request(ctx!.app).get(`/api/v1/tasks/${taskId}`);
    expect(gotTask.status).toBe(404);
  });
});
