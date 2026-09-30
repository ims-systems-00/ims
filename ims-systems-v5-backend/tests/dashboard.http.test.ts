import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createTestApp, type TestContext } from "./helpers/create-test-app";
import { getFunctionalUnitModel } from "../src/modules/functional-units/repositories/functional-unit.model";
import { getRiskModel } from "../src/modules/risks/repositories/risk.model";
import { DEV_STUB_ORGANIZATION_ID } from "../src/security";

const otherOrgId = "000000000000000000000099";

describe("Dashboard HTTP", () => {
  let ctx: TestContext | undefined;

  beforeAll(async () => {
    ctx = await createTestApp();
  }, 60_000);

  afterAll(async () => {
    if (ctx) await ctx.cleanup();
  });

  beforeEach(async () => {
    await getFunctionalUnitModel().deleteMany({});
    await getRiskModel().deleteMany({});
  });

  it("GET /api/v1/dashboard/organisation returns live summary", async () => {
    const response = await request(ctx!.app).get(
      "/api/v1/dashboard/organisation"
    );
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      context: "organisation",
      organizationId: DEV_STUB_ORGANIZATION_ID,
      metricScope: "identity-list-scope",
    });
    expect(response.body.data.accurateAs).toBeTruthy();
    expect(response.body.data.headline).toMatchObject({
      organisationalState: "Safe",
      criticalArea: null,
    });
    expect(response.body.data.modules).toHaveProperty("risks");
    expect(response.body.data.modules).toHaveProperty("incidents");
    expect(response.body.data.counts).toHaveProperty("businessUnits");
  });

  it("rejects invalid date range", async () => {
    const response = await request(ctx!.app)
      .get("/api/v1/dashboard/organisation")
      .query({
        from: "2026-09-30T00:00:00.000Z",
        to: "2026-09-01T00:00:00.000Z",
      });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("GET functional-unit dashboard requires a valid unit in the org", async () => {
    const missing = await request(ctx!.app).get(
      "/api/v1/dashboard/functional-units/cccccccccccccccccccccccc"
    );
    expect(missing.status).toBe(404);

    const created = await request(ctx!.app)
      .post("/api/v1/functional-units")
      .send({
        name: "Operations",
        accessType: "Internal business function",
        responsibility: "Ops delivery",
        operatingLocation: "Manchester",
      });
    expect(created.status).toBe(201);
    const id = created.body.data.id as string;

    const response = await request(ctx!.app).get(
      `/api/v1/dashboard/functional-units/${id}`
    );
    expect(response.status).toBe(200);
    expect(response.body.data.context).toBe("functional-unit");
    expect(response.body.data.functionalUnit.id).toBe(id);
    expect(response.body.data.functionalUnit.name).toBe("Operations");
  });

  it("enforces organisation isolation on functional unit lookup", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/functional-units")
      .send({
        name: "Other Org Unit",
        accessType: "Internal business function",
        responsibility: "Hidden",
        operatingLocation: "Remote",
      });
    const id = created.body.data.id as string;

    await getFunctionalUnitModel().updateOne(
      { _id: id },
      { $set: { organizationId: otherOrgId } }
    );

    const response = await request(ctx!.app).get(
      `/api/v1/dashboard/functional-units/${id}`
    );
    expect(response.status).toBe(404);
  });

  it("rejects invalid functional unit id format", async () => {
    const response = await request(ctx!.app).get(
      "/api/v1/dashboard/functional-units/not-valid"
    );
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("reflects risk stats in organisation headline confidence", async () => {
    await request(ctx!.app).post("/api/v1/risks").send({
      title: "Access control gap",
      description: "Privileged accounts without review",
      type: "Organisational",
      ownerId: "bbbbbbbbbbbbbbbbbbbbbbbb",
      likelihood: 3,
      consequence: 3,
    });

    const response = await request(ctx!.app).get(
      "/api/v1/dashboard/organisation"
    );
    expect(response.status).toBe(200);
    expect(response.body.data.modules.risks.total).toBeGreaterThanOrEqual(1);
    expect(
      response.body.data.headline.organisationalConfidence
    ).toBeGreaterThanOrEqual(20);
  });
});
