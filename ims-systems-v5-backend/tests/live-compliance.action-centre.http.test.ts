import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createTestApp, type TestContext } from "./helpers/create-test-app";
import { DEV_STUB_ORGANIZATION_ID } from "../src/security/development-stub";
import { buildCatalogueFromJson } from "../src/modules/compliance/lib/catalogue-builder";
import { createComplianceControlRepository } from "../src/modules/compliance/repositories/compliance-control.repository";
import { getControlStatusModel } from "../src/modules/compliance/repositories/control-status.model";
import { getTenderCertificateModel } from "../src/modules/tender/repositories/tender-certificate.model";

const toolkit = "ISO 9001";

describe("Action centre HTTP", () => {
  let ctx: TestContext | undefined;

  beforeAll(async () => {
    process.env.LIVE_COMPLIANCE_STALE_MS = "0";
    ctx = await createTestApp();
  }, 60_000);

  afterAll(async () => {
    delete process.env.LIVE_COMPLIANCE_STALE_MS;
    if (ctx) await ctx.cleanup();
  });

  it("lists expired certificates and implemented clauses without evidence, by urgency", async () => {
    const rows = buildCatalogueFromJson(toolkit, [
      { clause: "5", title: "Leadership", type: "Clause" },
      { clause: "5.2", title: "Policy", type: "Control" },
      { clause: "5.3", title: "Roles", type: "Control" },
    ]);
    await createComplianceControlRepository().upsertCatalogue(toolkit, rows);
    await request(ctx!.app).post("/api/v1/compliance/toolkits").send({ name: toolkit }).expect(201);

    await getControlStatusModel().updateMany(
      { organizationId: DEV_STUB_ORGANIZATION_ID, name: toolkit, clause: { $in: ["5", "5.2"] } },
      { $set: { state: "Implemented" } }
    );
    await getTenderCertificateModel().create({
      organizationId: DEV_STUB_ORGANIZATION_ID,
      entityId: "cert-iso9001",
      name: "ISO 9001",
      standard: "ISO 9001",
      expires: "2020-01-31",
    });

    const res = await request(ctx!.app).get("/api/v1/live-compliance/action-centre");
    expect(res.status).toBe(200);
    const data = res.body.data;
    // Dev stub → treated as admin, so unowned items are "mine".
    expect(data.scope).toBe("mine");
    expect(data.readiness).toEqual([expect.objectContaining({ standard: "ISO 9001" })]);

    const certItem = data.items.find((i: { module: string }) => i.module === "certificates");
    expect(certItem).toMatchObject({
      bucket: "now",
      severity: "high",
      title: "ISO 9001 certificate expired 31 Jan 2020",
    });

    // Parent clause "5" has children → only leaf 5.2 is missing evidence.
    const evidence = data.items.find((i: { id: string }) => i.id === "evidence-ISO 9001");
    expect(evidence).toMatchObject({
      clause: "5.2",
      title: "ISO 9001 5.2 Policy has no evidence",
      bucket: "later",
    });
    expect(data.counts.total).toBe(data.items.length);

    expect((await request(ctx!.app).get("/api/v1/live-compliance/action-centre?scope=bad")).status).toBe(400);
  });
});
