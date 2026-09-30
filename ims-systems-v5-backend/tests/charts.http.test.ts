import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createTestApp, type TestContext } from "./helpers/create-test-app";
import { getChartModel } from "../src/modules/charts/repositories/chart.model";
import { DEV_STUB_ORGANIZATION_ID } from "../src/security";

const otherOrgId = "000000000000000000000099";

const validBody = {
  name: "Incidents by priority",
  description: "Group-count incidents by priority",
  derivation: {
    sourceModule: "incidents",
    operation: "group-count",
    groupBy: ["priority"],
  },
  config: { chartType: "bar" },
};

describe("Charts HTTP", () => {
  let ctx: TestContext | undefined;

  beforeAll(async () => {
    ctx = await createTestApp();
  }, 60_000);

  afterAll(async () => {
    if (ctx) await ctx.cleanup();
  });

  beforeEach(async () => {
    await getChartModel().deleteMany({});
  });

  it("POST /api/v1/charts creates a definition", async () => {
    const response = await request(ctx!.app)
      .post("/api/v1/charts")
      .send(validBody);
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      name: "Incidents by priority",
      organizationId: DEV_STUB_ORGANIZATION_ID,
      derivation: {
        sourceModule: "incidents",
        operation: "group-count",
        groupBy: ["priority"],
      },
    });
  });

  it("rejects duplicate names in the same organisation", async () => {
    await request(ctx!.app).post("/api/v1/charts").send(validBody);
    const response = await request(ctx!.app)
      .post("/api/v1/charts")
      .send(validBody);
    expect(response.status).toBe(409);
  });

  it("rejects raw MongoDB pipeline-style payloads", async () => {
    const response = await request(ctx!.app)
      .post("/api/v1/charts")
      .send({
        name: "Unsafe",
        description: "Must not accept pipeline",
        pipeline: [{ $match: {} }, { $group: { _id: "$status" } }],
      });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects unsupported source modules and dimensions", async () => {
    const badModule = await request(ctx!.app)
      .post("/api/v1/charts")
      .send({
        ...validBody,
        name: "Bad module",
        derivation: {
          sourceModule: "arbitrary-collection",
          operation: "count",
        },
      });
    expect(badModule.status).toBe(400);

    const badGroup = await request(ctx!.app)
      .post("/api/v1/charts")
      .send({
        ...validBody,
        name: "Bad group",
        derivation: {
          sourceModule: "risks",
          operation: "group-count",
          groupBy: ["$password"],
        },
      });
    expect(badGroup.status).toBe(400);
  });

  it("lists charts with search and never returns other-org definitions", async () => {
    await request(ctx!.app).post("/api/v1/charts").send(validBody);
    await getChartModel().create({
      organizationId: otherOrgId,
      name: "Other org chart",
      description: "Hidden",
      derivation: {
        sourceModule: "risks",
        operation: "count",
      },
      createdBy: "other",
      createdOn: new Date(),
    });

    const listed = await request(ctx!.app)
      .get("/api/v1/charts")
      .query({ search: "Incidents" });
    expect(listed.status).toBe(200);
    expect(listed.body.data.total).toBe(1);
    expect(listed.body.data.items[0].name).toBe("Incidents by priority");
    expect(
      listed.body.data.items.every(
        (item: { organizationId: string }) =>
          item.organizationId === DEV_STUB_ORGANIZATION_ID
      )
    ).toBe(true);
  });

  it("GET /:id is organisation-scoped", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/charts")
      .send(validBody);
    const id = created.body.data.id as string;

    await getChartModel().updateOne(
      { _id: id },
      { $set: { organizationId: otherOrgId } }
    );

    const response = await request(ctx!.app).get(`/api/v1/charts/${id}`);
    expect(response.status).toBe(404);
  });

  it("PATCH updates description/derivation but not name", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/charts")
      .send(validBody);
    const id = created.body.data.id as string;

    const response = await request(ctx!.app)
      .patch(`/api/v1/charts/${id}`)
      .send({
        description: "Updated description",
        derivation: {
          sourceModule: "incidents",
          operation: "count",
        },
        name: "Should be ignored by schema",
      });
    expect(response.status).toBe(200);
    expect(response.body.data.name).toBe("Incidents by priority");
    expect(response.body.data.description).toBe("Updated description");
    expect(response.body.data.derivation.operation).toBe("count");
  });

  it("DELETE hard-removes the definition", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/charts")
      .send(validBody);
    const id = created.body.data.id as string;

    const removed = await request(ctx!.app).delete(`/api/v1/charts/${id}`);
    expect(removed.status).toBe(200);

    const missing = await request(ctx!.app).get(`/api/v1/charts/${id}`);
    expect(missing.status).toBe(404);
  });

  it("requires sum metricField and group-count groupBy", async () => {
    const sumMissing = await request(ctx!.app)
      .post("/api/v1/charts")
      .send({
        name: "Sum without field",
        description: "Invalid",
        derivation: { sourceModule: "customers", operation: "sum" },
      });
    expect(sumMissing.status).toBe(400);

    const groupMissing = await request(ctx!.app)
      .post("/api/v1/charts")
      .send({
        name: "Group without dims",
        description: "Invalid",
        derivation: { sourceModule: "risks", operation: "group-count" },
      });
    expect(groupMissing.status).toBe(400);
  });
});
