import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createTestApp, type TestContext } from "./helpers/create-test-app";
import { buildCatalogueFromJson } from "../src/modules/compliance/lib/catalogue-builder";
import { createComplianceControlRepository } from "../src/modules/compliance/repositories/compliance-control.repository";
import { getComplianceControlModel } from "../src/modules/compliance/repositories/compliance-control.model";
import { getControlStatusModel } from "../src/modules/compliance/repositories/control-status.model";
import { getComplianceOverviewModel } from "../src/modules/compliance/repositories/compliance-overview.model";
import {
  getLegalDutyModel,
  getLegalRegisterSettingsModel,
} from "../src/modules/legal-register/repositories/legal-register.models";
import {
  getAdviceStateModel,
  getComplianceActivityModel,
} from "../src/modules/live-compliance/repositories/live-compliance.models";
import { COMMON_UK_DUTIES } from "../src/modules/legal-register";

const toolkit = "ISO 14001";

const clauseStatus = async (app: TestContext["app"], clause: string) => {
  const res = await request(app).get("/api/v1/live-compliance/modules/compliance");
  return res.body.data.clauses.find((c: { clause: string }) => c.clause === clause);
};

describe("Legal register HTTP", () => {
  let ctx: TestContext | undefined;

  beforeAll(async () => {
    process.env.LIVE_COMPLIANCE_STALE_MS = "0";
    ctx = await createTestApp();
  }, 60_000);

  afterAll(async () => {
    delete process.env.LIVE_COMPLIANCE_STALE_MS;
    if (ctx) await ctx.cleanup();
  });

  beforeEach(async () => {
    await Promise.all([
      getControlStatusModel().deleteMany({}),
      getComplianceOverviewModel().deleteMany({}),
      getComplianceControlModel().deleteMany({}),
      getLegalDutyModel().deleteMany({}),
      getLegalRegisterSettingsModel().deleteMany({}),
      getAdviceStateModel().deleteMany({}),
      getComplianceActivityModel().deleteMany({}),
    ]);
    const rows = buildCatalogueFromJson(toolkit, [
      { clause: "6", title: "Planning", type: "Clause" },
      { clause: "6.1", title: "Actions to address risks and opportunities", type: "Control" },
      { clause: "6.1.3", title: "Compliance obligations", type: "Control" },
      { clause: "9", title: "Performance evaluation", type: "Clause" },
      { clause: "9.1", title: "Monitoring", type: "Control" },
      { clause: "9.1.2", title: "Evaluation of compliance", type: "Control" },
    ]);
    await createComplianceControlRepository().upsertCatalogue(toolkit, rows);
    await request(ctx!.app).post("/api/v1/compliance/toolkits").send({ name: toolkit }).expect(201);
  });

  it("drives 6.1.3 and 9.1.2 from duties, evidence and register reviews", async () => {
    const empty = await request(ctx!.app).get("/api/v1/legal-register");
    expect(empty.status).toBe(200);
    expect(empty.body.data).toMatchObject({ duties: [], nextReviewDue: null });
    expect(await clauseStatus(ctx!.app, "9.1.2")).toMatchObject({ status: "not" });

    // Reviewing an empty register is refused.
    expect((await request(ctx!.app).post("/api/v1/legal-register/review")).status).toBe(409);

    const common = await request(ctx!.app).post("/api/v1/legal-register/duties/common");
    expect(common.body.data.added).toBe(COMMON_UK_DUTIES.length);
    const again = await request(ctx!.app).post("/api/v1/legal-register/duties/common");
    expect(again.body.data.added).toBe(0);

    expect(await clauseStatus(ctx!.app, "9.1.2")).toMatchObject({
      status: "prog",
      detail: `${COMMON_UK_DUTIES.length} legal duties with no evidence linked`,
    });
    expect(await clauseStatus(ctx!.app, "6.1.3")).toMatchObject({
      status: "prog",
      detail: "Legal register has never been reviewed",
    });

    // Evidence for every duty → 9.1.2 sustained.
    const register = await request(ctx!.app).get("/api/v1/legal-register");
    for (const duty of register.body.data.duties) {
      const res = await request(ctx!.app)
        .post(`/api/v1/legal-register/duties/${duty.id}/evidence`)
        .send({ label: "Assessment on file" });
      expect(res.status).toBe(201);
    }
    expect(await clauseStatus(ctx!.app, "9.1.2")).toMatchObject({ status: "sus" });

    // Duty-without-evidence advice deep-links to the register.
    const custom = await request(ctx!.app)
      .post("/api/v1/legal-register/duties")
      .send({ name: "Hazardous waste consignment notes", legislation: "Hazardous Waste Regulations 2005" });
    expect(custom.status).toBe(201);
    const advice = await request(ctx!.app).get("/api/v1/live-compliance/advice?module=compliance&limit=20");
    expect(advice.body.data.items.find((a: { id: string }) => a.id === `duty-${custom.body.data.id}`)).toMatchObject({
      clause: "9.1.2",
      action: { type: "navigate", href: `/compliance/legal-register?duty=${custom.body.data.id}` },
    });

    const reviewed = await request(ctx!.app).post("/api/v1/legal-register/review");
    expect(reviewed.status).toBe(200);
    expect(reviewed.body.data.settings.lastReviewedOn).toBeTruthy();
    expect(reviewed.body.data.nextReviewDue).toBeTruthy();
    expect(await clauseStatus(ctx!.app, "6.1.3")).toMatchObject({ status: "sus" });
  });

  it("validates input and removes evidence and duties", async () => {
    const bad = await request(ctx!.app).post("/api/v1/legal-register/duties").send({ name: "" });
    expect(bad.status).toBe(400);

    const duty = await request(ctx!.app)
      .post("/api/v1/legal-register/duties")
      .send({ name: "Fire risk assessment", legislation: "RRO 2005", reference: "art 9" });
    const withEvidence = await request(ctx!.app)
      .post(`/api/v1/legal-register/duties/${duty.body.data.id}/evidence`)
      .send({ label: "FRA 2026", url: "https://example.com/fra.pdf" });
    const evidenceId = withEvidence.body.data.evidence[0].id;
    expect(withEvidence.body.data.lastCheckedOn).toBeTruthy();

    const removed = await request(ctx!.app).delete(
      `/api/v1/legal-register/duties/${duty.body.data.id}/evidence/${evidenceId}`
    );
    expect(removed.body.data.evidence).toEqual([]);

    const settings = await request(ctx!.app)
      .patch("/api/v1/legal-register/settings")
      .send({ reviewIntervalMonths: 6 });
    expect(settings.body.data.settings.reviewIntervalMonths).toBe(6);

    await request(ctx!.app).delete(`/api/v1/legal-register/duties/${duty.body.data.id}`).expect(200);
    const after = await request(ctx!.app).get("/api/v1/legal-register");
    expect(after.body.data.duties).toEqual([]);
  });
});
