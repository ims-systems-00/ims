import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createTestApp, type TestContext } from "./helpers/create-test-app";
import { getOfiModel } from "../src/modules/ofi/repositories/ofi.model";
import { getAuditModel } from "../src/modules/audits/repositories/audit.model";
import { DEV_STUB_ORGANIZATION_ID } from "../src/security";

const otherOrgId = "000000000000000000000099";

describe("OFI HTTP", () => {
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
    await getOfiModel().deleteMany({});
    await getAuditModel().deleteMany({});
  });

  const createPayload = {
    title: "Improve access review evidence packing",
    opportunityForImprovement:
      "Centralise quarterly review packs in a controlled folder",
    ownerId: "bbbbbbbbbbbbbbbbbbbbbbbb",
    businessUnitId: "cccccccccccccccccccccccc",
    cost: 500,
  };

  it("POST /api/v1/ofi raises an OFI", async () => {
    const response = await request(ctx!.app)
      .post("/api/v1/ofi")
      .send(createPayload);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      title: createPayload.title,
      organizationId: DEV_STUB_ORGANIZATION_ID,
      displayStatus: "Pending",
      implemented: { status: "Pending" },
    });
    expect(response.body.data.reference).toMatch(/^OFI-/);
  });

  it("POST rejects missing required fields", async () => {
    const missing = await request(ctx!.app)
      .post("/api/v1/ofi")
      .send({ title: "Only title" });
    expect(missing.status).toBe(400);
    expect(missing.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("GET list supports search, status, and pagination", async () => {
    await request(ctx!.app).post("/api/v1/ofi").send(createPayload);
    await request(ctx!.app)
      .post("/api/v1/ofi")
      .send({
        ...createPayload,
        title: "Reduce paper waste in reception",
        opportunityForImprovement: "Move visitor logs to digital kiosk",
      });

    const listed = await request(ctx!.app).get("/api/v1/ofi").query({
      search: "access review",
      page: 1,
      pageSize: 10,
    });
    expect(listed.status).toBe(200);
    expect(listed.body.data.total).toBe(1);
    expect(listed.body.data.items[0].title).toContain("access review");

    const filtered = await request(ctx!.app).get("/api/v1/ofi").query({
      status: "Pending",
    });
    expect(filtered.status).toBe(200);
    expect(filtered.body.data.total).toBe(2);
  });

  it("enforces organisation isolation on get by id", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/ofi")
      .send(createPayload);
    const id = created.body.data.id as string;

    await getOfiModel().updateOne(
      { _id: id },
      { $set: { organizationId: otherOrgId } }
    );

    const response = await request(ctx!.app).get(`/api/v1/ofi/${id}`);
    expect(response.status).toBe(404);
  });

  it("supports activity → in progress → implement lifecycle", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/ofi")
      .send(createPayload);
    const id = created.body.data.id as string;

    const activity = await request(ctx!.app)
      .post(`/api/v1/ofi/${id}/activity`)
      .send({ message: "Started gathering evidence" });
    expect(activity.status).toBe(201);
    expect(activity.body.data.displayStatus).toBe("In Progress");
    expect(activity.body.data.activity.length).toBeGreaterThanOrEqual(2);

    const links = await request(ctx!.app)
      .put(`/api/v1/ofi/${id}/compliance-links`)
      .send({
        links: [{ toolkitId: "iso27001", clauseIds: ["A.5.1"] }],
      });
    expect(links.status).toBe(200);
    expect(links.body.data.complianceLinks).toHaveLength(1);

    const implemented = await request(ctx!.app).post(
      `/api/v1/ofi/${id}/implement`
    );
    expect(implemented.status).toBe(200);
    expect(implemented.body.data.displayStatus).toBe("Implemented");
    expect(implemented.body.data.implemented.status).toBe("Implemented");

    const blocked = await request(ctx!.app)
      .patch(`/api/v1/ofi/${id}`)
      .send({ title: "Should not update" });
    expect(blocked.status).toBe(409);

    const blockedDelete = await request(ctx!.app).delete(`/api/v1/ofi/${id}`);
    expect(blockedDelete.status).toBe(409);
  });

  it("soft-deletes a pending OFI", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/ofi")
      .send(createPayload);
    const id = created.body.data.id as string;

    const deleted = await request(ctx!.app).delete(`/api/v1/ofi/${id}`);
    expect(deleted.status).toBe(200);

    const listed = await request(ctx!.app).get("/api/v1/ofi");
    expect(listed.body.data.total).toBe(0);

    const get = await request(ctx!.app).get(`/api/v1/ofi/${id}`);
    expect(get.status).toBe(404);
  });

  it("GET /stats returns aggregates", async () => {
    await request(ctx!.app).post("/api/v1/ofi").send(createPayload);
    const stats = await request(ctx!.app).get("/api/v1/ofi/stats");
    expect(stats.status).toBe(200);
    expect(stats.body.data.total).toBeGreaterThanOrEqual(1);
    expect(stats.body.data.pending).toBeGreaterThanOrEqual(1);
  });

  it("promotes embedded audit OFIs on audit completion", async () => {
    const auditPayload = {
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

    const created = await request(ctx!.app)
      .post("/api/v1/audits")
      .send(auditPayload);
    const auditId = created.body.data.items[0].id as string;

    const ofi = await request(ctx!.app)
      .post(`/api/v1/audits/${auditId}/ofis`)
      .send({
        title: "Improve logging",
        opportunityForImprovement: "Centralise audit logs",
      });
    expect(ofi.status).toBe(201);

    const completed = await request(ctx!.app).post(
      `/api/v1/audits/${auditId}/complete`
    );
    expect(completed.status).toBe(200);

    const listed = await request(ctx!.app).get("/api/v1/ofi").query({
      sourceModuleType: "audits",
      sourceModuleId: auditId,
    });
    expect(listed.status).toBe(200);
    expect(listed.body.data.total).toBe(1);
    expect(listed.body.data.items[0].title).toBe("Improve logging");
    expect(listed.body.data.items[0].source).toMatchObject({
      moduleType: "audits",
      moduleId: auditId,
    });
  });

  it("rejects invalid id format", async () => {
    const response = await request(ctx!.app).get("/api/v1/ofi/not-an-id");
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });
});
