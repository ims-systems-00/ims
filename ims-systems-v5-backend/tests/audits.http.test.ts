import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createTestApp, type TestContext } from "./helpers/create-test-app";
import { getAuditModel } from "../src/modules/audits/repositories/audit.model";
import { getIncidentModel } from "../src/modules/incidents/repositories/incident.model";
import { getRiskModel } from "../src/modules/risks/repositories/risk.model";
import { DEV_STUB_ORGANIZATION_ID } from "../src/security";

const otherOrgId = "000000000000000000000099";

describe("Audits HTTP", () => {
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
    await getAuditModel().deleteMany({});
    await getIncidentModel().deleteMany({});
    await getRiskModel().deleteMany({});
  });

  const createPayload = {
    title: "ISO 27001 internal review",
    focusArea: "Access control",
    auditorId: "bbbbbbbbbbbbbbbbbbbbbbbb",
    businessUnitId: "cccccccccccccccccccccccc",
    complianceBodyId: "dddddddddddddddddddddddd",
    startDate: new Date(Date.now() - 86_400_000).toISOString(),
    interval: "Yearly",
    type: "Internal",
    time: "09:00",
  };

  it("POST /api/v1/audits schedules an audit", async () => {
    const response = await request(ctx!.app)
      .post("/api/v1/audits")
      .send(createPayload);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.items).toHaveLength(1);
    expect(response.body.data.items[0]).toMatchObject({
      title: "ISO 27001 internal review",
      type: "Internal",
      organizationId: DEV_STUB_ORGANIZATION_ID,
      displayStatus: "Scheduled",
      interval: "Yearly",
    });
    expect(response.body.data.items[0].reference).toMatch(/^AUD-/);
  });

  it("POST schedules four quarterly audits", async () => {
    const response = await request(ctx!.app)
      .post("/api/v1/audits")
      .send({ ...createPayload, interval: "Quarterly" });

    expect(response.status).toBe(201);
    expect(response.body.data.items).toHaveLength(4);
  });

  it("POST rejects missing required fields", async () => {
    const missing = await request(ctx!.app)
      .post("/api/v1/audits")
      .send({ title: "Only title" });
    expect(missing.status).toBe(400);
    expect(missing.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("GET list supports type, search, status, and pagination", async () => {
    await request(ctx!.app).post("/api/v1/audits").send(createPayload);
    await request(ctx!.app)
      .post("/api/v1/audits")
      .send({
        ...createPayload,
        title: "Supplier security assessment",
        type: "External",
        focusArea: "Third party",
      });

    const listed = await request(ctx!.app).get("/api/v1/audits").query({
      type: "Internal",
      search: "27001",
      page: 1,
      pageSize: 10,
    });
    expect(listed.status).toBe(200);
    expect(listed.body.data.total).toBe(1);
    expect(listed.body.data.items[0].title).toBe("ISO 27001 internal review");

    const filtered = await request(ctx!.app).get("/api/v1/audits").query({
      status: "Scheduled",
      type: "External",
    });
    expect(filtered.status).toBe(200);
    expect(filtered.body.data.total).toBe(1);
    expect(filtered.body.data.items[0].type).toBe("External");
  });

  it("enforces organisation isolation on get by id", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/audits")
      .send(createPayload);
    const id = created.body.data.items[0].id as string;

    await getAuditModel().updateOne(
      { _id: id },
      { $set: { organizationId: otherOrgId } }
    );

    const response = await request(ctx!.app).get(`/api/v1/audits/${id}`);
    expect(response.status).toBe(404);
  });

  it("supports findings CRUD then complete with promotion", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/audits")
      .send(createPayload);
    const id = created.body.data.items[0].id as string;

    const nc = await request(ctx!.app)
      .post(`/api/v1/audits/${id}/identifications`)
      .send({
        nonConformity: "Missing access review",
        rootCause: "Process not documented",
      });
    expect(nc.status).toBe(201);
    expect(nc.body.data.identifications).toHaveLength(1);

    const risk = await request(ctx!.app)
      .post(`/api/v1/audits/${id}/risks`)
      .send({
        title: "Weak MFA",
        description: "Admin accounts lack MFA",
        likelihood: 3,
        consequence: 4,
      });
    expect(risk.status).toBe(201);
    expect(risk.body.data.risks[0].total).toBe(12);

    const ofi = await request(ctx!.app)
      .post(`/api/v1/audits/${id}/ofis`)
      .send({
        title: "Improve logging",
        opportunityForImprovement: "Centralise audit logs",
      });
    expect(ofi.status).toBe(201);
    expect(ofi.body.data.ofis).toHaveLength(1);

    const completed = await request(ctx!.app).post(
      `/api/v1/audits/${id}/complete`
    );
    expect(completed.status).toBe(200);
    expect(completed.body.data.displayStatus).toBe("Completed");
    expect(completed.body.data.completed.status).toBe(true);

    const incidents = await request(ctx!.app)
      .get("/api/v1/incidents")
      .query({ sourceModuleType: "audits", sourceModuleId: id });
    expect(incidents.status).toBe(200);
    expect(incidents.body.data.total).toBe(1);
    expect(incidents.body.data.items[0].title).toBe("Missing access review");

    const risks = await request(ctx!.app).get("/api/v1/risks");
    expect(risks.status).toBe(200);
    const promotedRisk = risks.body.data.items.find(
      (item: { title: string }) => item.title === "Weak MFA"
    );
    expect(promotedRisk).toBeDefined();
    expect(promotedRisk.type).toBe("Organisational");
    expect(promotedRisk.source).toMatchObject({
      moduleType: "audits",
      moduleId: id,
    });

    const ofis = await request(ctx!.app).get("/api/v1/ofi").query({
      sourceModuleType: "audits",
      sourceModuleId: id,
    });
    expect(ofis.status).toBe(200);
    expect(ofis.body.data.total).toBe(1);
    expect(ofis.body.data.items[0].title).toBe("Improve logging");
    expect(ofis.body.data.items[0].source).toMatchObject({
      moduleType: "audits",
      moduleId: id,
    });

    const blocked = await request(ctx!.app)
      .patch(`/api/v1/audits/${id}`)
      .send({ title: "Should not update" });
    expect(blocked.status).toBe(409);
  });

  it("blocks completion before schedule date", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/audits")
      .send({
        ...createPayload,
        startDate: new Date(Date.now() + 7 * 86_400_000).toISOString(),
      });
    const id = created.body.data.items[0].id as string;

    const response = await request(ctx!.app).post(
      `/api/v1/audits/${id}/complete`
    );
    expect(response.status).toBe(409);
  });

  it("soft-deletes a scheduled audit", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/audits")
      .send(createPayload);
    const id = created.body.data.items[0].id as string;

    const deleted = await request(ctx!.app).delete(`/api/v1/audits/${id}`);
    expect(deleted.status).toBe(200);

    const listed = await request(ctx!.app).get("/api/v1/audits");
    expect(listed.body.data.total).toBe(0);

    const get = await request(ctx!.app).get(`/api/v1/audits/${id}`);
    expect(get.status).toBe(404);
  });

  it("sets compliance links and extracts report", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/audits")
      .send(createPayload);
    const id = created.body.data.items[0].id as string;

    const links = await request(ctx!.app)
      .put(`/api/v1/audits/${id}/compliance-links`)
      .send({
        links: [{ toolkitId: "iso27001", clauseIds: ["A.5.1", "A.8.2"] }],
      });
    expect(links.status).toBe(200);
    expect(links.body.data.complianceLinks).toHaveLength(1);

    const report = await request(ctx!.app)
      .post(`/api/v1/audits/${id}/reports`)
      .send({
        recipientName: "Ada Lovelace",
        recipientEmail: "ada@example.com",
      });
    expect(report.status).toBe(200);
    expect(report.body.data.message).toMatch(/queued/i);
  });

  it("GET /stats returns aggregates", async () => {
    await request(ctx!.app).post("/api/v1/audits").send(createPayload);
    const stats = await request(ctx!.app).get("/api/v1/audits/stats");
    expect(stats.status).toBe(200);
    expect(stats.body.data.total).toBeGreaterThanOrEqual(1);
    expect(stats.body.data.scheduled).toBeGreaterThanOrEqual(1);
  });
});
