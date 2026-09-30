import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createTestApp, type TestContext } from "./helpers/create-test-app";
import { getHardwareAssetModel } from "../src/modules/assets/repositories/hardware.model";
import { getSoftwareAssetModel } from "../src/modules/assets/repositories/software.model";
import { getPeopleAssetModel } from "../src/modules/assets/repositories/people.model";
import { getPremiseAssetModel } from "../src/modules/assets/repositories/premise.model";
import { getInformationAssetModel } from "../src/modules/assets/repositories/information.model";
import { DEV_STUB_ORGANIZATION_ID } from "../src/security";

describe("Assets HTTP", () => {
  let ctx: TestContext | undefined;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    if (ctx) {
      await ctx.cleanup();
    }
  });

  beforeEach(async () => {
    await Promise.all([
      getHardwareAssetModel().deleteMany({}),
      getSoftwareAssetModel().deleteMany({}),
      getPeopleAssetModel().deleteMany({}),
      getPremiseAssetModel().deleteMany({}),
      getInformationAssetModel().deleteMany({}),
    ]);
  });

  it("POST /api/v1/assets/hardware creates a hardware asset", async () => {
    const response = await request(ctx!.app)
      .post("/api/v1/assets/hardware")
      .send({
        name: "MacBook Pro",
        ownerId: "111111111111111111111111",
        cost: 2400,
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      name: "MacBook Pro",
      ownerId: "111111111111111111111111",
      organizationId: DEV_STUB_ORGANIZATION_ID,
      cost: 2400,
    });
    expect(response.body.data.reference).toMatch(/^HD-/);
    expect(response.body.data.id).toBeTruthy();
  });

  it("POST hardware rejects missing owner with VALIDATION_ERROR", async () => {
    const response = await request(ctx!.app)
      .post("/api/v1/assets/hardware")
      .send({ name: "No owner" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("lists, gets, updates, and soft-deletes hardware", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/assets/hardware")
      .send({
        name: "Monitor",
        ownerId: "111111111111111111111111",
        tag: "MON-1",
      });
    const id = created.body.data.id as string;

    const listed = await request(ctx!.app).get(
      "/api/v1/assets/hardware?search=Monitor"
    );
    expect(listed.status).toBe(200);
    expect(listed.body.data.total).toBe(1);
    expect(listed.body.data.pageSize).toBe(10);

    const found = await request(ctx!.app).get(`/api/v1/assets/hardware/${id}`);
    expect(found.status).toBe(200);
    expect(found.body.data.name).toBe("Monitor");

    const updated = await request(ctx!.app)
      .patch(`/api/v1/assets/hardware/${id}`)
      .send({ name: "Monitor Updated", cost: 350 });
    expect(updated.status).toBe(200);
    expect(updated.body.data.name).toBe("Monitor Updated");
    expect(updated.body.data.cost).toBe(350);

    const deleted = await request(ctx!.app).delete(
      `/api/v1/assets/hardware/${id}`
    );
    expect(deleted.status).toBe(200);

    const missing = await request(ctx!.app).get(`/api/v1/assets/hardware/${id}`);
    expect(missing.status).toBe(404);

    const listedAfter = await request(ctx!.app).get("/api/v1/assets/hardware");
    expect(listedAfter.body.data.total).toBe(0);
  });

  it("returns 404 for unknown hardware id", async () => {
    const response = await request(ctx!.app).get(
      "/api/v1/assets/hardware/cccccccccccccccccccccccc"
    );
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });

  it("manages software CRUD, keys, and documents", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/assets/software")
      .send({
        name: "Slack",
        licenceCount: 25,
        installCount: 20,
        cost: 1200,
      });
    expect(created.status).toBe(201);
    expect(created.body.data.reference).toMatch(/^SFT-/);
    const id = created.body.data.id as string;

    const withKey = await request(ctx!.app)
      .post(`/api/v1/assets/software/${id}/keys`)
      .send({ value: "LICENCE-KEY-ABC" });
    expect(withKey.status).toBe(200);
    expect(withKey.body.data.keys).toHaveLength(1);
    const keyId = withKey.body.data.keys[0].id as string;

    const withDoc = await request(ctx!.app)
      .post(`/api/v1/assets/software/${id}/documents`)
      .send({
        fileName: "licence.pdf",
        mimeType: "application/pdf",
        storageKey: "uploads/licence.pdf",
      });
    expect(withDoc.status).toBe(200);
    expect(withDoc.body.data.documents).toHaveLength(1);
    const documentId = withDoc.body.data.documents[0].id as string;

    const withoutKey = await request(ctx!.app).delete(
      `/api/v1/assets/software/${id}/keys/${keyId}`
    );
    expect(withoutKey.status).toBe(200);
    expect(withoutKey.body.data.keys).toHaveLength(0);

    const withoutDoc = await request(ctx!.app).delete(
      `/api/v1/assets/software/${id}/documents/${documentId}`
    );
    expect(withoutDoc.status).toBe(200);
    expect(withoutDoc.body.data.documents).toHaveLength(0);
  });

  it("creates people, premise, and information with required fields", async () => {
    const people = await request(ctx!.app)
      .post("/api/v1/assets/people")
      .send({
        name: "Alex",
        role: "Analyst",
        skill: "Risk assessment",
      });
    expect(people.status).toBe(201);
    expect(people.body.data.reference).toMatch(/^PPL-/);

    const premise = await request(ctx!.app)
      .post("/api/v1/assets/premise")
      .send({
        name: "HQ",
        location: "M1 1AA",
        address: "1 Main Street",
      });
    expect(premise.status).toBe(201);
    expect(premise.body.data.reference).toMatch(/^PRE-/);

    const information = await request(ctx!.app)
      .post("/api/v1/assets/information")
      .send({
        title: "Customer PII",
        format: "Database",
      });
    expect(information.status).toBe(201);
    expect(information.body.data.reference).toMatch(/^INF-/);
  });

  it("rejects people create without skill", async () => {
    const response = await request(ctx!.app)
      .post("/api/v1/assets/people")
      .send({ name: "Alex", role: "Analyst" });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns inventory stats", async () => {
    await request(ctx!.app).post("/api/v1/assets/hardware").send({
      name: "Laptop",
      ownerId: "111111111111111111111111",
      cost: 100,
    });
    await request(ctx!.app).post("/api/v1/assets/software").send({
      name: "IDE",
      cost: 50,
    });

    const stats = await request(ctx!.app).get("/api/v1/assets/stats");
    expect(stats.status).toBe(200);
    expect(stats.body.data.totalCount).toBe(2);
    expect(stats.body.data.totalCost).toBe(150);
  });
});
