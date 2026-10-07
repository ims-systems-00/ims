import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createTestApp, type TestContext } from "./helpers/create-test-app";
import { getKpiObjectiveModel } from "../src/modules/kpi-objectives/repositories/kpi-objective.model";
import { getFunctionalUnitModel } from "../src/modules/functional-units/repositories/functional-unit.model";
import { DEV_STUB_ORGANIZATION_ID } from "../src/security";

const otherOrgId = "000000000000000000000099";
const buId = "cccccccccccccccccccccccc";

describe("KPI Objectives HTTP", () => {
  let ctx: TestContext | undefined;

  beforeAll(async () => {
    ctx = await createTestApp();
  }, 60_000);

  afterAll(async () => {
    if (ctx) await ctx.cleanup();
  });

  beforeEach(async () => {
    await getKpiObjectiveModel().deleteMany({});
    await getFunctionalUnitModel().deleteMany({});
    await getFunctionalUnitModel().create({
      _id: buId,
      organizationId: DEV_STUB_ORGANIZATION_ID,
      reference: "FU-TEST-1",
      name: "Operations",
      accessType: "Internal business function",
      responsibility: "Ops",
      operatingLocation: "London",
      totalMembers: 0,
      complianceToolkits: [],
      userLicences: {
        superUser: { allocated: 0, used: 0 },
        hosUser: { allocated: 0, used: 0 },
        basicUser: { allocated: 0, used: 0 },
        auditorUser: { allocated: 0, used: 0 },
      },
      isSystemDefault: false,
      deletedAt: null,
    });
  });

  it("POST /api/v1/kpi-objectives creates an organisational KPI", async () => {
    const response = await request(ctx!.app)
      .post("/api/v1/kpi-objectives")
      .send({
        value: "Maintain ISO certification",
        privacy: "Organisational",
      });
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      value: "Maintain ISO certification",
      privacy: "Organisational",
      organizationId: DEV_STUB_ORGANIZATION_ID,
    });
    expect(response.body.data.reference).toMatch(/^KPI-/);
    expect(response.body.data.businessUnitId).toBeUndefined();
  });

  it("creates a business-unit KPI when the unit exists", async () => {
    const response = await request(ctx!.app)
      .post("/api/v1/kpi-objectives")
      .send({
        value: "Zero overdue audits",
        privacy: "Business unit",
        businessUnitId: buId,
      });
    expect(response.status).toBe(201);
    expect(response.body.data.privacy).toBe("Business unit");
    expect(response.body.data.businessUnitId).toBe(buId);
  });

  it("rejects business-unit KPI for unknown unit", async () => {
    const response = await request(ctx!.app)
      .post("/api/v1/kpi-objectives")
      .send({
        value: "Missing unit",
        privacy: "Business unit",
        businessUnitId: "dddddddddddddddddddddddd",
      });
    expect(response.status).toBe(400);
  });

  it("rejects organisational create with businessUnitId", async () => {
    const response = await request(ctx!.app)
      .post("/api/v1/kpi-objectives")
      .send({
        value: "Bad combo",
        privacy: "Organisational",
        businessUnitId: buId,
      });
    expect(response.status).toBe(400);
  });

  it("lists KPIs scoped to organisation and supports privacy filter", async () => {
    await request(ctx!.app).post("/api/v1/kpi-objectives").send({
      value: "Org KPI",
      privacy: "Organisational",
    });
    await request(ctx!.app).post("/api/v1/kpi-objectives").send({
      value: "BU KPI",
      privacy: "Business unit",
      businessUnitId: buId,
    });
    await getKpiObjectiveModel().create({
      organizationId: otherOrgId,
      reference: "KPI-OTHER",
      value: "Other org",
      privacy: "Organisational",
      targetValue: 0,
      currentValue: 0,
      progressPercentage: 0,
      unit: "",
      createdBy: "other",
      createdOn: new Date(),
    });

    const list = await request(ctx!.app).get("/api/v1/kpi-objectives");
    expect(list.status).toBe(200);
    expect(list.body.data.total).toBe(2);
    expect(
      list.body.data.items.every(
        (row: { organizationId: string }) =>
          row.organizationId === DEV_STUB_ORGANIZATION_ID
      )
    ).toBe(true);

    const orgOnly = await request(ctx!.app).get(
      "/api/v1/kpi-objectives?privacy=Organisational"
    );
    expect(orgOnly.body.data.total).toBe(1);
    expect(orgOnly.body.data.items[0].value).toBe("Org KPI");
  });

  it("GET /:id is organisation-scoped", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/kpi-objectives")
      .send({ value: "Scoped", privacy: "Organisational" });
    const id = created.body.data.id as string;

    const ok = await request(ctx!.app).get(`/api/v1/kpi-objectives/${id}`);
    expect(ok.status).toBe(200);

    await getKpiObjectiveModel().updateOne(
      { _id: id },
      { organizationId: otherOrgId }
    );
    const denied = await request(ctx!.app).get(`/api/v1/kpi-objectives/${id}`);
    expect(denied.status).toBe(404);
  });

  it("PATCH updates value and progress fields for creator", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/kpi-objectives")
      .send({
        value: "Initial",
        privacy: "Organisational",
        targetValue: 100,
      });
    const id = created.body.data.id as string;

    const updated = await request(ctx!.app)
      .patch(`/api/v1/kpi-objectives/${id}`)
      .send({ value: "Updated statement", currentValue: 25 });
    expect(updated.status).toBe(200);
    expect(updated.body.data.value).toBe("Updated statement");
    expect(updated.body.data.currentValue).toBe(25);
    expect(updated.body.data.progressPercentage).toBe(25);
  });

  it("DELETE hard-removes the KPI", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/kpi-objectives")
      .send({ value: "To delete", privacy: "Organisational" });
    const id = created.body.data.id as string;

    const removed = await request(ctx!.app).delete(
      `/api/v1/kpi-objectives/${id}`
    );
    expect(removed.status).toBe(200);

    const missing = await request(ctx!.app).get(`/api/v1/kpi-objectives/${id}`);
    expect(missing.status).toBe(404);
  });

  it("rejects empty value", async () => {
    const response = await request(ctx!.app)
      .post("/api/v1/kpi-objectives")
      .send({ value: "   ", privacy: "Organisational" });
    expect(response.status).toBe(400);
  });
});
