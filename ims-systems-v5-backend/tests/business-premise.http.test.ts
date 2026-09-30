import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createTestApp, type TestContext } from "./helpers/create-test-app";
import { getBusinessPremiseModel } from "../src/modules/business-premise/repositories/business-premise.model";
import { getFunctionalUnitModel } from "../src/modules/functional-units/repositories/functional-unit.model";
import { DEV_STUB_ORGANIZATION_ID } from "../src/security";

const otherOrgId = "000000000000000000000099";

describe("Business Premise HTTP", () => {
  let ctx: TestContext | undefined;
  let internalUnitId: string;
  let secondInternalUnitId: string;
  let externalUnitId: string;

  beforeAll(async () => {
    ctx = await createTestApp();
  }, 60_000);

  afterAll(async () => {
    if (ctx) {
      await ctx.cleanup();
    }
  });

  beforeEach(async () => {
    await getBusinessPremiseModel().deleteMany({});
    await getFunctionalUnitModel().deleteMany({});

    const internal = await request(ctx!.app)
      .post("/api/v1/functional-units")
      .send({
        name: "Operations",
        accessType: "Internal business function",
        responsibility: "Deliver operational services",
        operatingLocation: "Manchester",
      });
    expect(internal.status).toBe(201);
    internalUnitId = internal.body.data.id as string;

    const second = await request(ctx!.app)
      .post("/api/v1/functional-units")
      .send({
        name: "Support",
        accessType: "Internal business function",
        responsibility: "Support services",
        operatingLocation: "Leeds",
      });
    expect(second.status).toBe(201);
    secondInternalUnitId = second.body.data.id as string;

    const external = await request(ctx!.app)
      .post("/api/v1/functional-units")
      .send({
        name: "Partner Desk",
        accessType: "External function",
        responsibility: "Partner coordination",
        operatingLocation: "Remote",
      });
    expect(external.status).toBe(201);
    externalUnitId = external.body.data.id as string;
  });

  function createPayload(overrides: Record<string, unknown> = {}) {
    return {
      name: "Head Office",
      location: "Manchester",
      address: "1 Market Street",
      functionalUnitIds: [internalUnitId],
      ...overrides,
    };
  }

  it("POST /api/v1/business-premises creates a premise", async () => {
    const response = await request(ctx!.app)
      .post("/api/v1/business-premises")
      .send(createPayload());

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      name: "Head Office",
      location: "Manchester",
      address: "1 Market Street",
      organizationId: DEV_STUB_ORGANIZATION_ID,
      reference: "",
      functionalUnitIds: [internalUnitId],
    });
    expect(response.body.data.id).toBeTruthy();
    expect(response.body.data.createdBy).toBeTruthy();
  });

  it("POST rejects missing required fields", async () => {
    const missing = await request(ctx!.app)
      .post("/api/v1/business-premises")
      .send({ name: "Only name" });
    expect(missing.status).toBe(400);
    expect(missing.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("POST rejects empty functionalUnitIds", async () => {
    const response = await request(ctx!.app)
      .post("/api/v1/business-premises")
      .send(createPayload({ functionalUnitIds: [] }));
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("POST rejects unknown Functional Unit ids", async () => {
    const response = await request(ctx!.app)
      .post("/api/v1/business-premises")
      .send(
        createPayload({
          functionalUnitIds: ["ffffffffffffffffffffffff"],
        })
      );
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("POST rejects non-Internal Functional Units", async () => {
    const response = await request(ctx!.app)
      .post("/api/v1/business-premises")
      .send(createPayload({ functionalUnitIds: [externalUnitId] }));
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("POST rejects invalid ObjectId format", async () => {
    const response = await request(ctx!.app)
      .post("/api/v1/business-premises")
      .send(createPayload({ functionalUnitIds: ["not-an-id"] }));
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("GET list supports search, sort, and pagination", async () => {
    await request(ctx!.app)
      .post("/api/v1/business-premises")
      .send(createPayload());
    await request(ctx!.app)
      .post("/api/v1/business-premises")
      .send(
        createPayload({
          name: "Warehouse North",
          location: "Leeds",
          address: "9 Dock Road",
        })
      );

    const listed = await request(ctx!.app)
      .get("/api/v1/business-premises")
      .query({
        search: "warehouse",
        page: 1,
        pageSize: 10,
        sort: "name",
        sortDir: "asc",
      });
    expect(listed.status).toBe(200);
    expect(listed.body.data.total).toBe(1);
    expect(listed.body.data.items[0].name).toBe("Warehouse North");

    const paged = await request(ctx!.app)
      .get("/api/v1/business-premises")
      .query({ page: 1, pageSize: 1 });
    expect(paged.status).toBe(200);
    expect(paged.body.data.items).toHaveLength(1);
    expect(paged.body.data.total).toBe(2);
    expect(paged.body.data.totalPages).toBe(2);
  });

  it("GET by id returns the premise", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/business-premises")
      .send(createPayload());
    const id = created.body.data.id as string;

    const response = await request(ctx!.app).get(
      `/api/v1/business-premises/${id}`
    );
    expect(response.status).toBe(200);
    expect(response.body.data.name).toBe("Head Office");
  });

  it("enforces organisation isolation on get by id", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/business-premises")
      .send(createPayload());
    const id = created.body.data.id as string;

    await getBusinessPremiseModel().updateOne(
      { _id: id },
      { $set: { organizationId: otherOrgId } }
    );

    const response = await request(ctx!.app).get(
      `/api/v1/business-premises/${id}`
    );
    expect(response.status).toBe(404);
  });

  it("enforces organisation isolation on update and delete", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/business-premises")
      .send(createPayload());
    const id = created.body.data.id as string;

    await getBusinessPremiseModel().updateOne(
      { _id: id },
      { $set: { organizationId: otherOrgId } }
    );

    const updated = await request(ctx!.app)
      .patch(`/api/v1/business-premises/${id}`)
      .send({ name: "Hijack" });
    expect(updated.status).toBe(404);

    const deleted = await request(ctx!.app).delete(
      `/api/v1/business-premises/${id}`
    );
    expect(deleted.status).toBe(404);

    const stillThere = await getBusinessPremiseModel().findById(id).exec();
    expect(stillThere).not.toBeNull();
    expect(stillThere?.organizationId).toBe(otherOrgId);
  });

  it("PATCH updates fields and replaces functional units", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/business-premises")
      .send(createPayload());
    const id = created.body.data.id as string;

    const response = await request(ctx!.app)
      .patch(`/api/v1/business-premises/${id}`)
      .send({
        name: "HQ Annex",
        location: "Salford",
        address: "2 Quay Street",
        functionalUnitIds: [internalUnitId, secondInternalUnitId],
      });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      name: "HQ Annex",
      location: "Salford",
      address: "2 Quay Street",
      functionalUnitIds: [internalUnitId, secondInternalUnitId],
    });
    expect(response.body.data.updatedBy).toBeTruthy();
  });

  it("DELETE hard-removes the premise", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/business-premises")
      .send(createPayload());
    const id = created.body.data.id as string;

    const deleted = await request(ctx!.app).delete(
      `/api/v1/business-premises/${id}`
    );
    expect(deleted.status).toBe(200);

    const get = await request(ctx!.app).get(`/api/v1/business-premises/${id}`);
    expect(get.status).toBe(404);

    const doc = await getBusinessPremiseModel().findById(id).exec();
    expect(doc).toBeNull();
  });

  it("POST /:id/functional-units attaches a unit and rejects duplicates", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/business-premises")
      .send(createPayload());
    const id = created.body.data.id as string;

    const attached = await request(ctx!.app)
      .post(`/api/v1/business-premises/${id}/functional-units`)
      .send({ functionalUnitId: secondInternalUnitId });
    expect(attached.status).toBe(200);
    expect(attached.body.data.functionalUnitIds).toEqual(
      expect.arrayContaining([internalUnitId, secondInternalUnitId])
    );

    const duplicate = await request(ctx!.app)
      .post(`/api/v1/business-premises/${id}/functional-units`)
      .send({ functionalUnitId: secondInternalUnitId });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe("CONFLICT");
  });

  it("rejects attach of External Functional Unit", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/business-premises")
      .send(createPayload());
    const id = created.body.data.id as string;

    const response = await request(ctx!.app)
      .post(`/api/v1/business-premises/${id}/functional-units`)
      .send({ functionalUnitId: externalUnitId });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("GET rejects invalid id format", async () => {
    const response = await request(ctx!.app).get(
      "/api/v1/business-premises/not-valid"
    );
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("list does not include other-organisation premises", async () => {
    await request(ctx!.app)
      .post("/api/v1/business-premises")
      .send(createPayload());

    await getBusinessPremiseModel().create({
      organizationId: otherOrgId,
      reference: "",
      name: "Other Org Site",
      location: "Elsewhere",
      address: "99 Hidden Lane",
      functionalUnitIds: [internalUnitId],
      createdBy: "other-user",
      createdOn: new Date(),
    });

    const listed = await request(ctx!.app).get("/api/v1/business-premises");
    expect(listed.status).toBe(200);
    expect(listed.body.data.total).toBe(1);
    expect(listed.body.data.items[0].name).toBe("Head Office");
  });
});
