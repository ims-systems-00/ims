import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createTestApp, type TestContext } from "./helpers/create-test-app";
import { getFunctionalUnitModel } from "../src/modules/functional-units/repositories/functional-unit.model";
import { getRiskModel } from "../src/modules/risks/repositories/risk.model";
import { getIncidentModel } from "../src/modules/incidents/repositories/incident.model";

const otherOrgId = "000000000000000000000099";

describe("Stats HTTP", () => {
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
    await getIncidentModel().deleteMany({});
  });

  it("GET /api/v1/stats/global returns live headline metrics", async () => {
    const response = await request(ctx!.app).get("/api/v1/stats/global");
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      organizationalConfidence: expect.any(Number),
      organizationalState: "Safe",
      criticalArea: "No Critical Area",
      businessUnit: 0,
      numberOfStaffs: expect.any(Number),
      numberOfStaffsRemote: expect.any(Number),
      complianceBodies: 0,
    });
    expect(response.body.data.accurateAs).toBeTruthy();
    expect(response.body.data.incidentResolutionTimes).toHaveLength(4);
  });

  it("rejects invalid date range on global stats", async () => {
    const response = await request(ctx!.app)
      .get("/api/v1/stats/global")
      .query({
        startDate: "2026-09-30T00:00:00.000Z",
        endDate: "2026-09-01T00:00:00.000Z",
      });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects invalid months on risk stats", async () => {
    const response = await request(ctx!.app)
      .get("/api/v1/stats/risk")
      .query({ months: 0 });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("GET all ten stats categories succeed", async () => {
    const paths = [
      "/api/v1/stats/global",
      "/api/v1/stats/digital-maturity",
      "/api/v1/stats/compliance",
      "/api/v1/stats/audit",
      "/api/v1/stats/risk",
      "/api/v1/stats/incident",
      "/api/v1/stats/inventory",
      "/api/v1/stats/supplier",
      "/api/v1/stats/cip",
      "/api/v1/stats/crm",
    ];
    for (const path of paths) {
      const response = await request(ctx!.app).get(path);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    }
  });

  it("compliance stats report unavailable when Compliance module is missing", async () => {
    const response = await request(ctx!.app).get("/api/v1/stats/compliance");
    expect(response.status).toBe(200);
    expect(response.body.data.unavailable).toBe(true);
    expect(response.body.data.frameworks).toEqual([]);
  });

  it("crm stats report invoicesUnavailable when Invoices module is missing", async () => {
    const response = await request(ctx!.app).get("/api/v1/stats/crm");
    expect(response.status).toBe(200);
    expect(response.body.data.invoicesUnavailable).toBe(true);
    expect(response.body.data.invoicesByMonth).toHaveLength(12);
  });

  it("global and risk stats respect organisation isolation", async () => {
    await getRiskModel().create({
      organizationId: otherOrgId,
      reference: "RK-OTHER",
      title: "Other org risk",
      description: "Must not appear",
      type: "Hardware",
      ownerId: "bbbbbbbbbbbbbbbbbbbbbbbb",
      likelihood: 5,
      consequence: 5,
      currentScore: { likelihood: 5, consequence: 5, total: 25 },
      initialScore: { likelihood: 5, consequence: 5, total: 25 },
      mitigated: { status: false, by: null, on: null },
      accepted: { status: false, by: null, on: null },
      escalated: { status: false, by: null, on: null },
      attachments: [],
      complianceLinks: [],
      activity: [],
      raisedBy: "bbbbbbbbbbbbbbbbbbbbbbbb",
      raisedOn: new Date(),
    });

    await request(ctx!.app)
      .post("/api/v1/risks")
      .send({
        title: "Our risk",
        description: "In scope",
        type: "Software",
        likelihood: 2,
        consequence: 2,
        ownerId: "bbbbbbbbbbbbbbbbbbbbbbbb",
      });

    const global = await request(ctx!.app).get("/api/v1/stats/global");
    expect(global.status).toBe(200);
    expect(global.body.data.criticalArea).toBe("Software");
    // One open, unmitigated risk → Hazardous by V4 mitigation-ratio thresholds.
    expect(global.body.data.organizationalState).toBe("Hazardous");

    const risk = await request(ctx!.app).get("/api/v1/stats/risk");
    expect(risk.status).toBe(200);
    const softwareSeries = risk.body.data.byType.series.Software as number[];
    expect(softwareSeries.reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(1);
    const hardwareSeries = risk.body.data.byType.series.Hardware as number[];
    expect(hardwareSeries.reduce((a, b) => a + b, 0)).toBe(0);
  });

  it("digital maturity lists only internal business units", async () => {
    const internal = await request(ctx!.app)
      .post("/api/v1/functional-units")
      .send({
        name: "Ops",
        accessType: "Internal business function",
        responsibility: "Ops",
        operatingLocation: "Manchester",
      });
    expect(internal.status).toBe(201);

    await request(ctx!.app)
      .post("/api/v1/functional-units")
      .send({
        name: "Partner",
        accessType: "External function",
        responsibility: "Ext",
        operatingLocation: "London",
      });

    const response = await request(ctx!.app).get(
      "/api/v1/stats/digital-maturity"
    );
    expect(response.status).toBe(200);
    expect(response.body.data.businessUnitMaturity).toHaveLength(1);
    expect(response.body.data.businessUnitMaturity[0].name).toBe("Ops");
    expect(response.body.data.organisationalMaturity).toHaveLength(7);
  });

  it("inventory stats return five asset areas", async () => {
    const response = await request(ctx!.app).get("/api/v1/stats/inventory");
    expect(response.status).toBe(200);
    expect(response.body.data.areas).toEqual([
      "Hardware",
      "Software",
      "People",
      "Premises",
      "Information",
    ]);
    expect(response.body.data.amounts).toHaveLength(5);
    expect(response.body.data.costs).toHaveLength(5);
  });
});
