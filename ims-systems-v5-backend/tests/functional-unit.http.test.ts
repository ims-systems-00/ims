import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createTestApp, type TestContext } from "./helpers/create-test-app";
import { getFunctionalUnitModel } from "../src/modules/functional-units/repositories/functional-unit.model";
import { getUnitMembershipModel } from "../src/modules/users/repositories/unit-membership.model";
import { getUserModel } from "../src/modules/users/repositories/user.model";
import { createUserRepository } from "../src/modules/users/repositories/user.repository";
import { hashPassword } from "../src/modules/users/services/password";
import { DEV_STUB_ORGANIZATION_ID } from "../src/security";

async function seedUser(email: string, name = "Test User") {
  const [firstName, ...rest] = name.split(" ");
  const repository = createUserRepository();
  return repository.create({
    type: "Internal",
    firstName: firstName ?? "Test",
    lastName: rest.join(" ") || "User",
    email,
    reference: `USR-${Date.now().toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .slice(2, 6)
      .toUpperCase()}`,
    passwordHash: await hashPassword("Password1!"),
    systemPasswordStatus: "blocked",
    systemAccessPeriod: "Full time",
    systemAccessExpires: null,
    createdBy: null,
  });
}

describe("Functional Units HTTP", () => {
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
    await getFunctionalUnitModel().deleteMany({});
    await getUserModel().deleteMany({});
    await getUnitMembershipModel().deleteMany({});
  });

  const businessPayload = {
    name: "Operations",
    accessType: "Internal business function",
    responsibility: "Deliver operational services",
    operatingLocation: "Manchester",
  };

  it("POST /api/v1/functional-units creates a unit", async () => {
    const response = await request(ctx!.app)
      .post("/api/v1/functional-units")
      .send(businessPayload);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      name: "Operations",
      accessType: "Internal business function",
      organizationId: DEV_STUB_ORGANIZATION_ID,
      totalMembers: 0,
      isSystemDefault: false,
    });
    expect(response.body.data.id).toBeTruthy();
    expect(response.body.data.reference).toMatch(/^FU-/);
  });

  it("POST rejects invalid body with VALIDATION_ERROR", async () => {
    const response = await request(ctx!.app)
      .post("/api/v1/functional-units")
      .send({ name: "Only name" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("GET list returns created units with pagination", async () => {
    await request(ctx!.app).post("/api/v1/functional-units").send(businessPayload);
    await request(ctx!.app)
      .post("/api/v1/functional-units")
      .send({
        ...businessPayload,
        name: "Support",
        operatingLocation: "Leeds",
      });

    const response = await request(ctx!.app).get(
      "/api/v1/functional-units?page=1&pageSize=10&search=Support"
    );

    expect(response.status).toBe(200);
    expect(response.body.data.total).toBe(1);
    expect(response.body.data.items[0].name).toBe("Support");
  });

  it("GET by id returns unit; unknown id is 404", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/functional-units")
      .send(businessPayload);

    const found = await request(ctx!.app).get(
      `/api/v1/functional-units/${created.body.data.id}`
    );
    expect(found.status).toBe(200);
    expect(found.body.data.name).toBe("Operations");

    const missing = await request(ctx!.app).get(
      "/api/v1/functional-units/cccccccccccccccccccccccc"
    );
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe("NOT_FOUND");
  });

  it("PATCH updates descriptive fields", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/functional-units")
      .send(businessPayload);

    const updated = await request(ctx!.app)
      .patch(`/api/v1/functional-units/${created.body.data.id}`)
      .send({
        name: "Ops Renamed",
        responsibility: "Updated responsibility",
      });

    expect(updated.status).toBe(200);
    expect(updated.body.data.name).toBe("Ops Renamed");
    expect(updated.body.data.accessType).toBe("Internal business function");
  });

  it("DELETE soft-deletes and hides from list/get", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/functional-units")
      .send(businessPayload);
    const id = created.body.data.id as string;

    const deleted = await request(ctx!.app).delete(
      `/api/v1/functional-units/${id}`
    );
    expect(deleted.status).toBe(200);

    const getAfter = await request(ctx!.app).get(
      `/api/v1/functional-units/${id}`
    );
    expect(getAfter.status).toBe(404);

    const list = await request(ctx!.app).get("/api/v1/functional-units");
    expect(list.body.data.total).toBe(0);
  });

  it("attaches policy and assigns compliance toolkits", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/functional-units")
      .send(businessPayload);
    const id = created.body.data.id as string;

    const policy = await request(ctx!.app)
      .post(`/api/v1/functional-units/${id}/policy`)
      .send({ policyId: "policy-123" });
    expect(policy.status).toBe(200);
    expect(policy.body.data.policyId).toBe("policy-123");

    const toolkits = await request(ctx!.app)
      .put(`/api/v1/functional-units/${id}/compliance-toolkits`)
      .send({ complianceToolkits: ["ISO 9001", "ISO 14001"] });
    expect(toolkits.status).toBe(200);
    expect(toolkits.body.data.complianceToolkits).toEqual([
      "ISO 9001",
      "ISO 14001",
    ]);
  });

  it("blocks detail actions on system default units", async () => {
    const model = getFunctionalUnitModel();
    const doc = await model.create({
      organizationId: DEV_STUB_ORGANIZATION_ID,
      reference: "FU-DEFAULT",
      name: "iMS System administration",
      accessType: "Internal business function",
      responsibility: "Platform administration",
      operatingLocation: "System",
      isSystemDefault: true,
      deletedAt: null,
    });

    const updated = await request(ctx!.app)
      .patch(`/api/v1/functional-units/${String(doc._id)}`)
      .send({ name: "Nope" });
    expect(updated.status).toBe(403);

    const deleted = await request(ctx!.app).delete(
      `/api/v1/functional-units/${String(doc._id)}`
    );
    expect(deleted.status).toBe(403);
  });

  it("adds, lists, rejects duplicate, and removes members without deleting users", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/functional-units")
      .send(businessPayload);
    const unitId = created.body.data.id as string;
    const user = await seedUser("member@example.com", "Ada Lovelace");

    const empty = await request(ctx!.app).get(
      `/api/v1/functional-units/${unitId}/members`
    );
    expect(empty.status).toBe(200);
    expect(empty.body.data.items).toEqual([]);

    const eligible = await request(ctx!.app).get(
      `/api/v1/functional-units/${unitId}/members/eligible`
    );
    expect(eligible.status).toBe(200);
    expect(
      eligible.body.data.items.some((m: { id: string }) => m.id === user.id)
    ).toBe(true);

    const added = await request(ctx!.app)
      .post(`/api/v1/functional-units/${unitId}/members`)
      .send({ userIds: [user.id] });
    expect(added.status).toBe(200);
    expect(added.body.data.unit.totalMembers).toBe(1);
    expect(added.body.data.members[0].email).toBe("member@example.com");

    const members = await request(ctx!.app).get(
      `/api/v1/functional-units/${unitId}/members`
    );
    expect(members.body.data.items).toHaveLength(1);

    const duplicate = await request(ctx!.app)
      .post(`/api/v1/functional-units/${unitId}/members`)
      .send({ userIds: [user.id] });
    expect(duplicate.status).toBe(409);

    const eligibleAfter = await request(ctx!.app).get(
      `/api/v1/functional-units/${unitId}/members/eligible`
    );
    expect(
      eligibleAfter.body.data.items.some(
        (m: { id: string }) => m.id === user.id
      )
    ).toBe(false);

    const removed = await request(ctx!.app).delete(
      `/api/v1/functional-units/${unitId}/members/${user.id}`
    );
    expect(removed.status).toBe(200);
    expect(removed.body.data.unit.totalMembers).toBe(0);

    const stillExists = await request(ctx!.app).get(
      `/api/v1/users/${user.id}/classified-info`
    );
    expect(stillExists.status).toBe(200);
    expect(stillExists.body.data.user.email).toBe("member@example.com");
  });

  it("rejects adding a nonexistent user", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/functional-units")
      .send(businessPayload);

    const response = await request(ctx!.app)
      .post(`/api/v1/functional-units/${created.body.data.id}/members`)
      .send({ userIds: ["dddddddddddddddddddddddd"] });

    expect(response.status).toBe(404);
  });
});
