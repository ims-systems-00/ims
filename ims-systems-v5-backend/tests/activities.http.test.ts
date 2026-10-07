import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createTestApp, type TestContext } from "./helpers/create-test-app";
import { getActivityModel } from "../src/modules/activities/repositories/activity.model";
import { getOfiModel } from "../src/modules/ofi/repositories/ofi.model";
import { DEV_STUB_IDENTITY, DEV_STUB_ORGANIZATION_ID } from "../src/security";

const otherOrgId = "000000000000000000000099";
const parentId = "aaaaaaaaaaaaaaaaaaaaaaaa";
const ofiId = "bbbbbbbbbbbbbbbbbbbbbbbb";
const unitId = "cccccccccccccccccccccccc";

const validBody = {
  moduleType: "incidents",
  moduleId: parentId,
  value: "Investigating root cause with ops team.",
};

describe("Activities HTTP", () => {
  let ctx: TestContext | undefined;

  beforeAll(async () => {
    ctx = await createTestApp();
  }, 60_000);

  afterAll(async () => {
    if (ctx) await ctx.cleanup();
  });

  beforeEach(async () => {
    await getActivityModel().deleteMany({});
    await getOfiModel().deleteMany({});
  });

  it("POST /api/v1/activities creates a manual comment", async () => {
    const response = await request(ctx!.app)
      .post("/api/v1/activities")
      .send(validBody);
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      moduleType: "incidents",
      moduleId: parentId,
      value: validBody.value,
      isAutomated: false,
      organizationId: DEV_STUB_ORGANIZATION_ID,
      createdBy: DEV_STUB_IDENTITY.subjectId,
      assignedTo: null,
    });
  });

  it("rejects empty value and unknown moduleType", async () => {
    const empty = await request(ctx!.app)
      .post("/api/v1/activities")
      .send({ ...validBody, value: "  " });
    expect(empty.status).toBe(400);

    const badType = await request(ctx!.app)
      .post("/api/v1/activities")
      .send({ ...validBody, moduleType: "documents" });
    expect(badType.status).toBe(400);
  });

  it("lists by moduleType+moduleId and never returns other-org rows", async () => {
    await request(ctx!.app).post("/api/v1/activities").send(validBody);
    await request(ctx!.app)
      .post("/api/v1/activities")
      .send({
        ...validBody,
        value: "Second comment",
      });
    await request(ctx!.app)
      .post("/api/v1/activities")
      .send({
        moduleType: "tasks",
        moduleId: parentId,
        value: "Task note",
      });

    await getActivityModel().create({
      organizationId: otherOrgId,
      moduleType: "incidents",
      moduleId: parentId,
      value: "leak",
      isAutomated: false,
      createdBy: "other",
      createdOn: new Date(),
    });

    const listed = await request(ctx!.app).get(
      `/api/v1/activities?moduleType=incidents&moduleId=${parentId}`
    );
    expect(listed.status).toBe(200);
    expect(listed.body.data.total).toBe(2);
    expect(
      listed.body.data.items.every(
        (row: { organizationId: string; moduleType: string }) =>
          row.organizationId === DEV_STUB_ORGANIZATION_ID &&
          row.moduleType === "incidents"
      )
    ).toBe(true);

    const missing = await request(ctx!.app).get("/api/v1/activities");
    expect(missing.status).toBe(400);
  });

  it("filters automated vs manual and threadId", async () => {
    await request(ctx!.app).post("/api/v1/activities").send(validBody);
    await getActivityModel().create({
      organizationId: DEV_STUB_ORGANIZATION_ID,
      moduleType: "incidents",
      moduleId: parentId,
      value: "System raised this incident.",
      isAutomated: true,
      metaInfo: { threadId: "thread-1" },
      createdBy: DEV_STUB_IDENTITY.subjectId,
      createdOn: new Date(),
    });

    const automated = await request(ctx!.app).get(
      `/api/v1/activities?moduleType=incidents&moduleId=${parentId}&isAutomated=true`
    );
    expect(automated.body.data.total).toBe(1);
    expect(automated.body.data.items[0].isAutomated).toBe(true);

    const byThread = await request(ctx!.app).get(
      `/api/v1/activities?moduleType=incidents&moduleId=${parentId}&threadId=thread-1`
    );
    expect(byThread.body.data.total).toBe(1);
    expect(byThread.body.data.items[0].metaInfo.threadId).toBe("thread-1");
  });

  it("GET /:id is organisation-scoped", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/activities")
      .send(validBody);
    const id = created.body.data.id as string;

    const ok = await request(ctx!.app).get(`/api/v1/activities/${id}`);
    expect(ok.status).toBe(200);

    await getActivityModel().updateOne(
      { _id: id },
      { organizationId: otherOrgId }
    );
    const denied = await request(ctx!.app).get(`/api/v1/activities/${id}`);
    expect(denied.status).toBe(404);
  });

  it("PATCH updates value for own manual comment only", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/activities")
      .send(validBody);
    const id = created.body.data.id as string;

    const updated = await request(ctx!.app)
      .patch(`/api/v1/activities/${id}`)
      .send({ value: "Updated comment body" });
    expect(updated.status).toBe(200);
    expect(updated.body.data.value).toBe("Updated comment body");

    const automated = await getActivityModel().create({
      organizationId: DEV_STUB_ORGANIZATION_ID,
      moduleType: "incidents",
      moduleId: parentId,
      value: "Automated",
      isAutomated: true,
      createdBy: DEV_STUB_IDENTITY.subjectId,
      createdOn: new Date(),
    });
    const blockedAuto = await request(ctx!.app)
      .patch(`/api/v1/activities/${String(automated._id)}`)
      .send({ value: "nope" });
    expect(blockedAuto.status).toBe(403);

    const foreign = await getActivityModel().create({
      organizationId: DEV_STUB_ORGANIZATION_ID,
      moduleType: "incidents",
      moduleId: parentId,
      value: "Someone else",
      isAutomated: false,
      createdBy: "other-user",
      createdOn: new Date(),
    });
    const blockedForeign = await request(ctx!.app)
      .patch(`/api/v1/activities/${String(foreign._id)}`)
      .send({ value: "nope" });
    expect(blockedForeign.status).toBe(403);
  });

  it("DELETE removes own manual comment only", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/activities")
      .send(validBody);
    const id = created.body.data.id as string;

    const removed = await request(ctx!.app).delete(`/api/v1/activities/${id}`);
    expect(removed.status).toBe(200);

    const gone = await request(ctx!.app).get(`/api/v1/activities/${id}`);
    expect(gone.status).toBe(404);

    const automated = await getActivityModel().create({
      organizationId: DEV_STUB_ORGANIZATION_ID,
      moduleType: "incidents",
      moduleId: parentId,
      value: "Automated",
      isAutomated: true,
      createdBy: DEV_STUB_IDENTITY.subjectId,
      createdOn: new Date(),
    });
    const blocked = await request(ctx!.app).delete(
      `/api/v1/activities/${String(automated._id)}`
    );
    expect(blocked.status).toBe(403);
  });

  it("creating activity on cips promotes Pending OFI to In Progress", async () => {
    await getOfiModel().create({
      _id: ofiId,
      organizationId: DEV_STUB_ORGANIZATION_ID,
      reference: "OFI-DEMO-001",
      title: "Improve patch cadence",
      opportunityForImprovement: "Automate monthly patch windows",
      businessUnitId: unitId,
      implemented: { status: "Pending", by: null, on: null },
      attachments: [],
      complianceLinks: [],
      activity: [],
      createdBy: DEV_STUB_IDENTITY.subjectId,
      createdOn: new Date(),
      updatedBy: null,
      updatedOn: null,
      nextNudgeAt: null,
      deletedAt: null,
    });

    const response = await request(ctx!.app)
      .post("/api/v1/activities")
      .send({
        moduleType: "cips",
        moduleId: ofiId,
        value: "Started investigating with compliance.",
      });
    expect(response.status).toBe(201);

    const ofi = await getOfiModel().findById(ofiId).lean();
    expect(ofi?.implemented?.status).toBe("In Progress");
  });
});
