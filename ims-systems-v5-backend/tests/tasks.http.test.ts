import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createTestApp, type TestContext } from "./helpers/create-test-app";
import { getTaskModel } from "../src/modules/tasks/repositories/task.model";
import {
  DEV_STUB_IDENTITY,
  DEV_STUB_ORGANIZATION_ID,
} from "../src/security";

const otherOrgId = "000000000000000000000099";

describe("Tasks HTTP", () => {
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
    await getTaskModel().deleteMany({});
  });

  const createPayload = {
    name: "Review access logs",
    description: "Weekly access review",
    priority: "High",
    teamPriority: false,
    assigneeIds: [DEV_STUB_IDENTITY.subjectId],
    dueDate: "2026-10-01T00:00:00.000Z",
  };

  it("POST /api/v1/tasks creates a task", async () => {
    const response = await request(ctx!.app)
      .post("/api/v1/tasks")
      .send(createPayload);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      name: "Review access logs",
      priority: "High",
      status: "Pending",
      organizationId: DEV_STUB_ORGANIZATION_ID,
      createdBy: DEV_STUB_IDENTITY.subjectId,
      teamPriority: false,
    });
    expect(response.body.data.reference).toMatch(/^TSK-/);
    expect(response.body.data.assignees).toEqual([
      { userId: DEV_STUB_IDENTITY.subjectId, acceptance: "Pending" },
    ]);
  });

  it("POST rejects missing name and team tasks without unit", async () => {
    const missing = await request(ctx!.app)
      .post("/api/v1/tasks")
      .send({ teamPriority: false });
    expect(missing.status).toBe(400);
    expect(missing.body.error.code).toBe("VALIDATION_ERROR");

    const team = await request(ctx!.app)
      .post("/api/v1/tasks")
      .send({ name: "Team task", teamPriority: true });
    expect(team.status).toBe(400);
  });

  it("GET list supports search, filter, and pagination", async () => {
    await request(ctx!.app).post("/api/v1/tasks").send(createPayload);
    await request(ctx!.app)
      .post("/api/v1/tasks")
      .send({
        ...createPayload,
        name: "Backup verification",
        description: "Confirm backup jobs",
        priority: "Low",
      });

    const listed = await request(ctx!.app).get("/api/v1/tasks").query({
      search: "access",
      page: 1,
      pageSize: 10,
    });
    expect(listed.status).toBe(200);
    expect(listed.body.data.total).toBe(1);
    expect(listed.body.data.items[0].name).toBe("Review access logs");

    const filtered = await request(ctx!.app).get("/api/v1/tasks").query({
      priority: "Low",
      statusPreset: "pending",
    });
    expect(filtered.status).toBe(200);
    expect(filtered.body.data.total).toBe(1);
    expect(filtered.body.data.items[0].priority).toBe("Low");
  });

  it("GET by id and PATCH update", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/tasks")
      .send(createPayload);
    const id = created.body.data.id as string;

    const got = await request(ctx!.app).get(`/api/v1/tasks/${id}`);
    expect(got.status).toBe(200);
    expect(got.body.data.name).toBe("Review access logs");

    const updated = await request(ctx!.app)
      .patch(`/api/v1/tasks/${id}`)
      .send({ description: "Updated description", priority: "Medium" });
    expect(updated.status).toBe(200);
    expect(updated.body.data.description).toBe("Updated description");
    expect(updated.body.data.priority).toBe("Medium");
  });

  it("accept → complete lifecycle using session identity", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/tasks")
      .send(createPayload);
    const id = created.body.data.id as string;

    const accepted = await request(ctx!.app).post(`/api/v1/tasks/${id}/accept`);
    expect(accepted.status).toBe(200);
    expect(accepted.body.data.status).toBe("In progress");
    expect(accepted.body.data.assignees[0].acceptance).toBe("Accepted");

    const completed = await request(ctx!.app).post(
      `/api/v1/tasks/${id}/complete`
    );
    expect(completed.status).toBe(200);
    expect(completed.body.data.status).toBe("Complete");

    const blocked = await request(ctx!.app)
      .patch(`/api/v1/tasks/${id}`)
      .send({ name: "Should fail" });
    expect(blocked.status).toBe(409);
  });

  it("decline records assignee response", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/tasks")
      .send(createPayload);
    const id = created.body.data.id as string;

    const declined = await request(ctx!.app).post(
      `/api/v1/tasks/${id}/decline`
    );
    expect(declined.status).toBe(200);
    expect(declined.body.data.assignees[0].acceptance).toBe("Declined");
    expect(declined.body.data.status).toBe("Pending");
  });

  it("nudge applies cooldown", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/tasks")
      .send(createPayload);
    const id = created.body.data.id as string;

    const first = await request(ctx!.app).post(`/api/v1/tasks/${id}/nudge`);
    expect(first.status).toBe(200);
    expect(first.body.data.nextNudgeAt).toBeTruthy();

    const second = await request(ctx!.app).post(`/api/v1/tasks/${id}/nudge`);
    expect(second.status).toBe(409);
  });

  it("soft-deletes a task and hides it from list/get", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/tasks")
      .send(createPayload);
    const id = created.body.data.id as string;

    const deleted = await request(ctx!.app).delete(`/api/v1/tasks/${id}`);
    expect(deleted.status).toBe(200);

    const listed = await request(ctx!.app).get("/api/v1/tasks");
    expect(listed.body.data.total).toBe(0);

    const got = await request(ctx!.app).get(`/api/v1/tasks/${id}`);
    expect(got.status).toBe(404);
  });

  it("enforces organisation isolation on get/update/delete", async () => {
    const model = getTaskModel();
    const foreign = await model.create({
      organizationId: otherOrgId,
      reference: "TSK-FOREIGN-1",
      name: "Other org task",
      description: "Should not be visible",
      dueDate: new Date(),
      priority: "Low",
      teamPriority: false,
      assignees: [{ userId: DEV_STUB_IDENTITY.subjectId, acceptance: "Pending" }],
      status: "Pending",
      attachments: [],
      activity: [],
      createdBy: DEV_STUB_IDENTITY.subjectId,
      createdOn: new Date(),
      deletedAt: null,
    });

    const id = String(foreign._id);

    const got = await request(ctx!.app).get(`/api/v1/tasks/${id}`);
    expect(got.status).toBe(404);

    const patched = await request(ctx!.app)
      .patch(`/api/v1/tasks/${id}`)
      .send({ name: "Hijack" });
    expect(patched.status).toBe(404);

    const removed = await request(ctx!.app).delete(`/api/v1/tasks/${id}`);
    expect(removed.status).toBe(404);

    const stillThere = await model.findById(id).exec();
    expect(stillThere).toBeTruthy();
    expect(stillThere!.name).toBe("Other org task");
  });

  it("hides tasks not created by or assigned to the subject", async () => {
    const model = getTaskModel();
    const hidden = await model.create({
      organizationId: DEV_STUB_ORGANIZATION_ID,
      reference: "TSK-HIDDEN-1",
      name: "Hidden task",
      description: "",
      dueDate: new Date(),
      priority: "Medium",
      teamPriority: false,
      assignees: [{ userId: "someone-else", acceptance: "Pending" }],
      status: "Pending",
      attachments: [],
      activity: [],
      createdBy: "another-creator",
      createdOn: new Date(),
      deletedAt: null,
    });

    const id = String(hidden._id);
    const got = await request(ctx!.app).get(`/api/v1/tasks/${id}`);
    expect(got.status).toBe(404);

    const listed = await request(ctx!.app).get("/api/v1/tasks");
    expect(listed.body.data.total).toBe(0);
  });

  it("GET analytics/top returns team and individual buckets", async () => {
    await request(ctx!.app).post("/api/v1/tasks").send(createPayload);

    const analytics = await request(ctx!.app).get(
      "/api/v1/tasks/analytics/top"
    );
    expect(analytics.status).toBe(200);
    expect(analytics.body.data.individualTasks.length).toBeGreaterThanOrEqual(
      1
    );
    expect(Array.isArray(analytics.body.data.teamTasks)).toBe(true);
  });

  it("cascades soft-delete when sourced risk is deleted", async () => {
    const riskId = "dddddddddddddddddddddddd";
    const created = await request(ctx!.app)
      .post("/api/v1/tasks")
      .send({
        ...createPayload,
        source: { moduleType: "risks", moduleId: riskId },
      });
    expect(created.status).toBe(201);

    const risk = await request(ctx!.app)
      .post("/api/v1/risks")
      .send({
        title: "Cascade risk",
        description: "Deletes linked tasks",
        type: "Hardware",
        likelihood: 2,
        consequence: 2,
        ownerId: "bbbbbbbbbbbbbbbbbbbbbbbb",
      });
    expect(risk.status).toBe(201);
    const actualRiskId = risk.body.data.id as string;

    const linked = await request(ctx!.app)
      .post("/api/v1/tasks")
      .send({
        ...createPayload,
        name: "Linked to real risk",
        source: { moduleType: "risks", moduleId: actualRiskId },
      });
    expect(linked.status).toBe(201);
    const linkedId = linked.body.data.id as string;

    const deleted = await request(ctx!.app).delete(
      `/api/v1/risks/${actualRiskId}`
    );
    expect(deleted.status).toBe(200);

    const got = await request(ctx!.app).get(`/api/v1/tasks/${linkedId}`);
    expect(got.status).toBe(404);
  });

  it("removes attachments by id", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/tasks")
      .send({
        ...createPayload,
        attachments: [
          {
            fileName: "notes.pdf",
            mimeType: "application/pdf",
            sizeBytes: 1024,
            storageKey: "uploads/notes.pdf",
          },
        ],
      });
    expect(created.status).toBe(201);
    const id = created.body.data.id as string;
    const attachmentId = created.body.data.attachments[0].id as string;

    const removed = await request(ctx!.app).delete(
      `/api/v1/tasks/${id}/attachments/${attachmentId}`
    );
    expect(removed.status).toBe(200);
    expect(removed.body.data.attachments).toHaveLength(0);
  });
});
