import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createTestApp, type TestContext } from "./helpers/create-test-app";
import { buildCatalogueFromJson } from "../src/modules/compliance/lib/catalogue-builder";
import { createComplianceControlRepository } from "../src/modules/compliance/repositories/compliance-control.repository";
import { getComplianceControlModel } from "../src/modules/compliance/repositories/compliance-control.model";
import { getControlStatusModel } from "../src/modules/compliance/repositories/control-status.model";
import { getComplianceOverviewModel } from "../src/modules/compliance/repositories/compliance-overview.model";
import { getManagementReviewModel } from "../src/modules/management-reviews/repositories/management-review.model";
import { getRiskModel } from "../src/modules/risks/repositories/risk.model";
import { getIncidentModel } from "../src/modules/incidents/repositories/incident.model";
import { getAuditModel } from "../src/modules/audits/repositories/audit.model";
import {
  getAdviceStateModel,
  getComplianceActivityModel,
} from "../src/modules/live-compliance/repositories/live-compliance.models";
import { addDaysIso, addMonthsIso, isoDay } from "../src/modules/live-compliance/lib/dates";
import { DEV_STUB_ORGANIZATION_ID } from "../src/security";

const toolkit = "ISO 9001";

async function seedCatalogue(): Promise<void> {
  const rows = buildCatalogueFromJson(toolkit, [
    { clause: "4", title: "Context of the organisation", type: "Clause" },
    { clause: "4.3", title: "Determining the scope", type: "Control" },
    { clause: "7", title: "Support", type: "Clause" },
    { clause: "7.2", title: "Competence", type: "Control" },
    { clause: "7.5", title: "Documented information", type: "Control" },
    { clause: "6", title: "Planning", type: "Clause" },
    { clause: "6.1", title: "Actions to address risks and opportunities", type: "Control" },
    { clause: "9", title: "Performance evaluation", type: "Clause" },
    { clause: "9.1", title: "Monitoring, measurement, analysis and evaluation", type: "Control" },
    // ISO 9001 9.1.2 is Customer satisfaction — must NOT get the 14001/45001 rule.
    { clause: "9.1.2", title: "Customer satisfaction", type: "Control" },
    { clause: "9.3", title: "Management review", type: "Control" },
    { clause: "10", title: "Improvement", type: "Clause" },
    { clause: "10.2", title: "Nonconformity and corrective action", type: "Control" },
  ]);
  await createComplianceControlRepository().upsertCatalogue(toolkit, rows);
}

/** A yearly review held long enough ago that the next one is due in 15 days. */
async function seedReviewDueSoon(): Promise<string> {
  const today = isoDay();
  const held = addDaysIso(addMonthsIso(today, -12), 15);
  await getManagementReviewModel().create({
    organizationId: DEV_STUB_ORGANIZATION_ID,
    reference: "MR-1",
    title: "Annual review",
    date: new Date(`${held}T09:00:00Z`),
    interval: "Yearly",
    privacy: "Organisational",
    completed: { status: true, by: "u1", on: new Date(`${held}T12:00:00Z`) },
    createdBy: "u1",
    createdOn: new Date(),
  });
  return addMonthsIso(held, 12);
}

describe("Live compliance HTTP", () => {
  let ctx: TestContext | undefined;

  beforeAll(async () => {
    // Evaluate on every read so each test sees its own seeded data.
    process.env.LIVE_COMPLIANCE_STALE_MS = "0";
    ctx = await createTestApp();
  }, 60_000);

  afterAll(async () => {
    delete process.env.LIVE_COMPLIANCE_STALE_MS;
    if (ctx) await ctx.cleanup();
  });

  beforeEach(async () => {
    await getControlStatusModel().deleteMany({});
    await getComplianceOverviewModel().deleteMany({});
    await getComplianceControlModel().deleteMany({});
    await getManagementReviewModel().deleteMany({});
    await getRiskModel().deleteMany({});
    await getIncidentModel().deleteMany({});
    await getAuditModel().deleteMany({});
    await getAdviceStateModel().deleteMany({});
    await getComplianceActivityModel().deleteMany({});
    await seedCatalogue();
  });

  it("returns empty health when no ISO toolkit is provisioned", async () => {
    const res = await request(ctx!.app).get("/api/v1/live-compliance/health");
    expect(res.status).toBe(200);
    expect(res.body.data.standards).toEqual([]);
    expect(res.body.data.clauses).toEqual([]);
  });

  it("computes live clause health on provisioned ISO toolkits", async () => {
    await request(ctx!.app).post("/api/v1/compliance/toolkits").send({ name: toolkit }).expect(201);
    const due = await seedReviewDueSoon();

    const res = await request(ctx!.app).get("/api/v1/live-compliance/health");
    expect(res.status).toBe(200);
    const clauses = res.body.data.clauses as Array<{
      clause: string;
      status: string;
      live: boolean;
      detail: string;
      due: string | null;
      module: string | null;
    }>;
    const byClause = Object.fromEntries(clauses.map((c) => [c.clause, c]));

    expect(byClause["9.3"]).toMatchObject({ status: "risk", live: true, due, module: "reviews" });
    expect(byClause["7.2"]).toMatchObject({ status: "not", live: true, module: "training" });
    // Manual clauses mirror the toolkit state.
    expect(byClause["4.3"]).toMatchObject({ status: "not", live: false });
    // 9.1.2 in ISO 9001 is customer satisfaction: no live rule applies.
    expect(byClause["9.1.2"]).toBeUndefined();

    const [standard] = res.body.data.standards;
    expect(standard).toMatchObject({ standard: toolkit, atRisk: 1, worst: "risk" });
    expect(standard.total).toBe(clauses.length);

    // Health is persisted onto the toolkit clause rows.
    const row = await getControlStatusModel()
      .findOne({ organizationId: DEV_STUB_ORGANIZATION_ID, name: toolkit, clause: "9.3" })
      .lean();
    expect(row?.health?.status).toBe("risk");

    const toolkitControls = await request(ctx!.app).get(
      `/api/v1/compliance/toolkits/${encodeURIComponent(toolkit)}/controls?search=9.3`
    );
    expect(toolkitControls.status).toBe(200);
    expect(
      toolkitControls.body.data.items.find((c: { clause: string }) => c.clause === "9.3").health.status
    ).toBe("risk");
  });

  it("returns module health for the module header", async () => {
    await request(ctx!.app).post("/api/v1/compliance/toolkits").send({ name: toolkit }).expect(201);
    await seedReviewDueSoon();
    const res = await request(ctx!.app).get("/api/v1/live-compliance/modules/reviews");
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ module: "reviews", name: "Management reviews", worst: "risk" });
    expect(res.body.data.clauses.map((c: { clause: string }) => c.clause)).toContain("9.3");

    const bad = await request(ctx!.app).get("/api/v1/live-compliance/modules/payroll");
    expect(bad.status).toBe(400);
  });

  it("lists advice, snoozes it, and rejects executing navigate-only items", async () => {
    await request(ctx!.app).post("/api/v1/compliance/toolkits").send({ name: toolkit }).expect(201);
    await seedReviewDueSoon();

    const listed = await request(ctx!.app).get("/api/v1/live-compliance/advice?module=reviews&limit=5");
    expect(listed.status).toBe(200);
    const item = listed.body.data.items.find((a: { clause: string }) => a.clause === "9.3");
    expect(item).toMatchObject({
      module: "reviews",
      severity: "med",
      action: { type: "navigate", label: "Schedule review", href: "/management-reviews?create=1" },
    });

    const action = await request(ctx!.app).post(
      `/api/v1/live-compliance/advice/${encodeURIComponent(item.id)}/action`
    );
    expect(action.status).toBe(400);

    const snoozed = await request(ctx!.app)
      .post(`/api/v1/live-compliance/advice/${encodeURIComponent(item.id)}/snooze`)
      .send({ days: 7 });
    expect(snoozed.status).toBe(200);
    expect(snoozed.body.data.adviceId).toBe(item.id);

    const after = await request(ctx!.app).get("/api/v1/live-compliance/advice?module=reviews&limit=5");
    expect(after.body.data.items.some((a: { id: string }) => a.id === item.id)).toBe(false);

    const missing = await request(ctx!.app).post("/api/v1/live-compliance/advice/nope/snooze").send({});
    expect(missing.status).toBe(404);
  });

  it("marks a risk reviewed from advice and moves its review date", async () => {
    await request(ctx!.app).post("/api/v1/compliance/toolkits").send({ name: toolkit }).expect(201);
    const reviewDue = addDaysIso(isoDay(), 10);
    const created = await request(ctx!.app).post("/api/v1/risks").send({
      title: "Machine guarding",
      description: "Press line 2 guarding",
      type: "Organisational",
      likelihood: 2,
      consequence: 4,
      nextReviewDate: reviewDue,
      area: "Press Line 2",
    });
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({ area: "Press Line 2", reviewIntervalMonths: 12 });

    const health = await request(ctx!.app).get("/api/v1/live-compliance/modules/risks");
    expect(health.body.data.clauses.find((c: { clause: string }) => c.clause === "6.1").status).toBe("risk");

    const advice = await request(ctx!.app).get("/api/v1/live-compliance/advice?module=risks&limit=10");
    const item = advice.body.data.items.find((a: { clause: string }) => a.clause === "6.1");
    expect(item.action).toMatchObject({ type: "execute", command: "risk.review", label: "Mark reviewed" });

    const ran = await request(ctx!.app).post(
      `/api/v1/live-compliance/advice/${encodeURIComponent(item.id)}/action`
    );
    expect(ran.status).toBe(200);
    expect(ran.body.data.message).toMatch(/reviewed$/);

    const risk = await request(ctx!.app).get(`/api/v1/risks/${created.body.data.id}`);
    expect(risk.body.data.nextReviewDate.slice(0, 10)).toBe(addMonthsIso(isoDay(), 12));
    expect(risk.body.data.lastReviewedOn).toBeTruthy();

    const after = await request(ctx!.app).get("/api/v1/live-compliance/modules/risks");
    expect(after.body.data.clauses.find((c: { clause: string }) => c.clause === "6.1").status).toBe("sus");
    const activity = await request(ctx!.app).get("/api/v1/live-compliance/activity");
    expect(activity.body.data.map((a: { text: string }) => a.text)).toEqual(
      expect.arrayContaining([expect.stringMatching(/reviewed$/), expect.stringMatching(/^Clause 6\.1 .* back to Sustained/)])
    );
  });

  it("new risks default to a review date one interval out", async () => {
    const created = await request(ctx!.app).post("/api/v1/risks").send({
      title: "Manual handling",
      description: "Despatch",
      type: "Organisational",
      likelihood: 3,
      consequence: 3,
      reviewIntervalMonths: 6,
    });
    expect(created.status).toBe(201);
    expect(created.body.data.nextReviewDate.slice(0, 10)).toBe(addMonthsIso(isoDay(), 6));
  });

  it("starts an incident investigation from advice", async () => {
    await request(ctx!.app).post("/api/v1/compliance/toolkits").send({ name: toolkit }).expect(201);
    const created = await request(ctx!.app).post("/api/v1/incidents").send({
      title: "Reached past light curtain",
      description: "Operator reached past the light curtain",
      privacy: "Organisational",
      incidentType: "Near miss",
      occurredOn: addDaysIso(isoDay(), -3),
      area: "Press Line 2",
    });
    expect(created.status).toBe(201);
    expect(created.body.data.investigation.status).toBe("not_started");

    const health = await request(ctx!.app).get("/api/v1/live-compliance/health");
    expect(
      health.body.data.clauses.find((c: { clause: string }) => c.clause === "10.2").detail
    ).toBe(`${created.body.data.reference} not investigated`);

    const advice = await request(ctx!.app).get("/api/v1/live-compliance/advice?module=incidents&limit=10");
    const item = advice.body.data.items[0];
    expect(item).toMatchObject({
      severity: "med",
      action: { type: "execute", command: "incident.investigate" },
    });
    const ran = await request(ctx!.app).post(
      `/api/v1/live-compliance/advice/${encodeURIComponent(item.id)}/action`
    );
    expect(ran.status).toBe(200);

    const incident = await request(ctx!.app).get(`/api/v1/incidents/${created.body.data.id}`);
    expect(incident.body.data.investigation).toMatchObject({ status: "in_progress" });
    expect(incident.body.data.investigation.startedOn).toBeTruthy();

    const again = await request(ctx!.app).post(`/api/v1/incidents/${created.body.data.id}/investigate`);
    expect(again.status).toBe(409);

    const done = await request(ctx!.app)
      .patch(`/api/v1/incidents/${created.body.data.id}`)
      .send({ investigationStatus: "done", rootCause: "Worn feed guide" });
    expect(done.status).toBe(200);
    expect(done.body.data.investigation).toMatchObject({ status: "done", rootCause: "Worn feed guide" });
    expect(done.body.data.investigation.completedOn).toBeTruthy();
  });

  it("tracks ISO 9.3 inputs on the next scheduled review", async () => {
    await request(ctx!.app).post("/api/v1/compliance/toolkits").send({ name: toolkit }).expect(201);
    await seedReviewDueSoon();
    const created = await request(ctx!.app).post("/api/v1/management-reviews").send({
      title: "Annual management review",
      date: `${addDaysIso(isoDay(), 10)}T09:00:00.000Z`,
      interval: "Yearly",
      privacy: "Organisational",
    });
    expect(created.status).toBe(201);
    const review = created.body.data.items[0];
    expect(review.inputs).toHaveLength(9);
    expect(review.inputs.every((i: { ready: boolean }) => !i.ready)).toBe(true);

    const patched = await request(ctx!.app)
      .patch(`/api/v1/management-reviews/${review.id}`)
      .send({ inputs: [{ key: "audit-results", ready: true }, { key: "objectives", ready: true, note: "2 of 3 on track" }] });
    expect(patched.status).toBe(200);
    const byKey = Object.fromEntries(
      patched.body.data.inputs.map((i: { key: string }) => [i.key, i])
    );
    expect(byKey["audit-results"]).toMatchObject({ ready: true });
    expect(byKey["objectives"]).toMatchObject({ ready: true, note: "2 of 3 on track" });
    expect(byKey["resources"]).toMatchObject({ ready: false });

    const bad = await request(ctx!.app)
      .patch(`/api/v1/management-reviews/${review.id}`)
      .send({ inputs: [{ key: "not-a-real-input", ready: true }] });
    expect(bad.status).toBe(400);

    const health = await request(ctx!.app).get("/api/v1/live-compliance/modules/reviews");
    expect(
      health.body.data.clauses.find((c: { clause: string }) => c.clause === "9.3").detail
    ).toContain("2 of 9 inputs ready");
  });

  it("tracks audit findings for 10.2 and closes them after the audit is completed", async () => {
    await request(ctx!.app).post("/api/v1/compliance/toolkits").send({ name: toolkit }).expect(201);
    const audit = await request(ctx!.app).post("/api/v1/audits").send({
      title: "Internal audit Q4",
      focusArea: "Competence",
      auditorId: "bbbbbbbbbbbbbbbbbbbbbbbb",
      businessUnitId: "cccccccccccccccccccccccc",
      complianceBodyId: "dddddddddddddddddddddddd",
      startDate: new Date(Date.now() - 86_400_000).toISOString(),
      interval: "Yearly",
      type: "Internal",
    });
    expect(audit.status).toBe(201);
    const created = audit.body.data.items[0];
    const auditId = created.id;

    const added = await request(ctx!.app)
      .post(`/api/v1/audits/${auditId}/identifications`)
      .send({
        nonConformity: "Toolbox talk records incomplete, Line 2",
        rootCause: "No owner for records",
        clause: "7.2",
        dueDate: addDaysIso(isoDay(), -1),
      });
    expect(added.status).toBe(201);
    const finding = added.body.data.identifications[0];
    expect(finding).toMatchObject({ clause: "7.2", status: "open" });

    await request(ctx!.app).post(`/api/v1/audits/${auditId}/complete`).expect(200);

    const health = await request(ctx!.app).get("/api/v1/live-compliance/modules/audits");
    const nc = health.body.data.clauses.find((c: { clause: string }) => c.clause === "10.2");
    expect(nc).toMatchObject({ status: "lapsed", detail: `${created.reference} NC-1 past its due date` });

    const noEvidence = await request(ctx!.app)
      .post(`/api/v1/audits/${auditId}/identifications/${finding.id}/status`)
      .send({ status: "closed" });
    expect(noEvidence.status).toBe(400);

    const closed = await request(ctx!.app)
      .post(`/api/v1/audits/${auditId}/identifications/${finding.id}/status`)
      .send({ status: "closed", closureNote: "Records completed and checked" });
    expect(closed.status).toBe(200);
    expect(closed.body.data.identifications[0]).toMatchObject({
      status: "closed",
      closureNote: "Records completed and checked",
    });

    const after = await request(ctx!.app).get("/api/v1/live-compliance/modules/audits");
    expect(after.body.data.clauses.find((c: { clause: string }) => c.clause === "10.2").status).toBe("sus");
  });

  it("validates the standard filter", async () => {
    const res = await request(ctx!.app).get("/api/v1/live-compliance/health?standard=ISO%2027001");
    expect(res.status).toBe(400);
  });

  it("returns the activity feed", async () => {
    const res = await request(ctx!.app).get("/api/v1/live-compliance/activity?limit=5");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
