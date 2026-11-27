import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createTestApp, type TestContext } from "./helpers/create-test-app";
import { DEV_STUB_ORGANIZATION_ID } from "../src/security/development-stub";
import { buildCatalogueFromJson } from "../src/modules/compliance/lib/catalogue-builder";
import { createComplianceControlRepository } from "../src/modules/compliance/repositories/compliance-control.repository";
import { getControlStatusModel } from "../src/modules/compliance/repositories/control-status.model";
import { JOURNEY_STEPS, buildJourney } from "../src/modules/live-compliance/lib/journey";

describe("journey rules", () => {
  it("auto-completes steps whose clauses are in place and points at the next step", () => {
    const j = buildJourney(
      [
        { clause: "4.3", standard: "ISO 9001", status: "impl" },
        { clause: "4.1", standard: "ISO 9001", status: "sus" },
        { clause: "4.2", standard: "ISO 9001", status: "not" },
        { clause: "5.2", standard: "ISO 9001", status: "risk" },
      ],
      ["context"],
      [70]
    );
    expect(j.total).toBe(12);
    expect(j.steps[0]).toMatchObject({ id: "scope", status: "done", auto: true });
    expect(j.steps[1]).toMatchObject({ id: "context", status: "done", auto: false });
    // 5.1/5.3/5.4 rows missing → only 5.2 counted, and At risk is still in place.
    expect(j.steps[2]).toMatchObject({ id: "leadership", status: "done", auto: true });
    expect(j.steps[3]).toMatchObject({ id: "risks", status: "now" });
    expect(j.steps[4]!.status).toBe("todo");
    expect(j).toMatchObject({ done: 3, next: "Risks, hazards, aspects and legal duties" });
  });

  it("only passes the readiness check when everything else is done and nothing lapsed", () => {
    const allManual = JOURNEY_STEPS.filter((s) => s.id !== "readiness").map((s) => s.id);
    expect(buildJourney([], allManual, [95]).steps[11]).toMatchObject({ status: "done", auto: true });
    expect(buildJourney([{ clause: "9.2", standard: "ISO 9001", status: "lapsed" }], allManual, [95]).steps[11]!.status).toBe("now");
    expect(buildJourney([], allManual, [80]).steps[11]!.status).toBe("now");
  });
});

describe("journey + ALICE HTTP", () => {
  let ctx: TestContext | undefined;

  beforeAll(async () => {
    process.env.LIVE_COMPLIANCE_STALE_MS = "0";
    ctx = await createTestApp();
  }, 60_000);

  afterAll(async () => {
    delete process.env.LIVE_COMPLIANCE_STALE_MS;
    if (ctx) await ctx.cleanup();
  });

  it("tracks journey progress from toolkit state and manual completion", async () => {
    const rows = buildCatalogueFromJson("ISO 9001", [
      { clause: "4", title: "Context", type: "Clause" },
      { clause: "4.3", title: "Scope", type: "Control" },
      { clause: "4.1", title: "Understanding the organisation", type: "Control" },
    ]);
    await createComplianceControlRepository().upsertCatalogue("ISO 9001", rows);
    await request(ctx!.app).post("/api/v1/compliance/toolkits").send({ name: "ISO 9001" }).expect(201);
    await getControlStatusModel().updateOne(
      { organizationId: DEV_STUB_ORGANIZATION_ID, name: "ISO 9001", clause: "4.3" },
      { $set: { state: "Implemented" } }
    );

    const first = await request(ctx!.app).get("/api/v1/live-compliance/journey");
    expect(first.status).toBe(200);
    expect(first.body.data.steps[0]).toMatchObject({ id: "scope", status: "done", auto: true });
    expect(first.body.data.steps[1]).toMatchObject({
      id: "context",
      status: "now",
      clauseStates: [{ clause: "4.1", standard: "ISO 9001", status: "not" }],
    });

    const marked = await request(ctx!.app)
      .post("/api/v1/live-compliance/journey/context/complete")
      .send({ done: true });
    expect(marked.body.data.steps[1]).toMatchObject({ status: "done", auto: false });
    expect(marked.body.data.done).toBe(2);

    const undone = await request(ctx!.app)
      .post("/api/v1/live-compliance/journey/context/complete")
      .send({ done: false });
    expect(undone.body.data.steps[1].status).toBe("now");

    expect((await request(ctx!.app).post("/api/v1/live-compliance/journey/nope/complete")).status).toBe(404);
  });

  it("lists ALICE tasks and reports when the AI provider is not configured", async () => {
    const tasks = await request(ctx!.app).get("/api/v1/live-compliance/alice/tasks");
    expect(tasks.body.data).toHaveLength(9);
    expect(tasks.body.data.find((t: { id: string }) => t.id === "incident_root_cause")).toMatchObject({
      requiresApproval: true,
    });

    const run = await request(ctx!.app)
      .post("/api/v1/live-compliance/alice/tasks/explain_clause/run")
      .send({ ref: "4.3" });
    // Streamed: progress lines first, then the provider error as a line.
    expect(run.status).toBe(200);
    const lines = String(run.text).trim().split("\n").map((l) => JSON.parse(l));
    expect(lines[0]).toEqual({ type: "status", message: "Read your compliance data" });
    expect(lines.at(-1)).toMatchObject({ type: "error", message: expect.stringContaining("Alice is not configured") });

    const badRef = await request(ctx!.app)
      .post("/api/v1/live-compliance/alice/tasks/incident_root_cause/run")
      .send({});
    expect(badRef.status).toBe(400);

    const drafts = await request(ctx!.app).get("/api/v1/live-compliance/alice/drafts?status=pending");
    expect(drafts.body.data).toEqual([]);
  });
});
