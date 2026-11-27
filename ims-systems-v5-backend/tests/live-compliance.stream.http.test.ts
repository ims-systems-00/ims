import { afterAll, beforeAll, describe, expect, it } from "vitest";
import http from "node:http";
import type { AddressInfo } from "node:net";
import request from "supertest";
import { createTestApp, type TestContext } from "./helpers/create-test-app";
import { DEV_STUB_ORGANIZATION_ID } from "../src/security/development-stub";
import { buildCatalogueFromJson } from "../src/modules/compliance/lib/catalogue-builder";
import { createComplianceControlRepository } from "../src/modules/compliance/repositories/compliance-control.repository";
import { getNotificationModel } from "../src/modules/notifications/repositories/notification.model";
import { getOrganisationMembershipModel } from "../src/modules/organisation/repositories/organisation-membership.model";
import { createUserRepository } from "../src/modules/users/repositories/user.repository";
import { hashPassword } from "../src/modules/users/services/password";

const toolkit = "ISO 14001";

/** Minimal SSE reader over a raw HTTP response. */
function openStream(port: number) {
  let buffer = "";
  const events: Array<{ type: string; data: unknown }> = [];
  let status = 0;
  let contentType = "";
  const req = http.get({ host: "127.0.0.1", port, path: "/api/v1/live-compliance/stream" }, (res) => {
    status = res.statusCode ?? 0;
    contentType = String(res.headers["content-type"] ?? "");
    res.setEncoding("utf8");
    res.on("data", (chunk: string) => {
      buffer += chunk;
      let index: number;
      while ((index = buffer.indexOf("\n\n")) >= 0) {
        const block = buffer.slice(0, index);
        buffer = buffer.slice(index + 2);
        const type = /^event: (.+)$/m.exec(block)?.[1];
        const data = /^data: (.+)$/m.exec(block)?.[1];
        if (type && data) events.push({ type, data: JSON.parse(data) });
      }
    });
  });
  req.on("error", () => undefined);
  return {
    events,
    meta: () => ({ status, contentType }),
    close: () => req.destroy(),
    async waitFor(type: string, timeoutMs = 5_000) {
      const started = Date.now();
      while (Date.now() - started < timeoutMs) {
        const found = events.find((e) => e.type === type);
        if (found) return found;
        await new Promise((r) => setTimeout(r, 20));
      }
      throw new Error(`Timed out waiting for "${type}"; got ${events.map((e) => e.type).join(", ")}`);
    },
  };
}

describe("Live compliance stream + record-change recalculation", () => {
  let ctx: TestContext | undefined;
  let server: http.Server | undefined;

  beforeAll(async () => {
    process.env.LIVE_COMPLIANCE_STALE_MS = "0";
    process.env.LIVE_COMPLIANCE_DEBOUNCE_MS = "50";
    ctx = await createTestApp();
    server = ctx.app.listen(0);
  }, 60_000);

  afterAll(async () => {
    delete process.env.LIVE_COMPLIANCE_STALE_MS;
    delete process.env.LIVE_COMPLIANCE_DEBOUNCE_MS;
    await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()));
    if (ctx) await ctx.cleanup();
  });

  it("pushes clause changes and notifies admins after a module write", async () => {
    const rows = buildCatalogueFromJson(toolkit, [
      { clause: "9", title: "Performance evaluation", type: "Clause" },
      { clause: "9.1", title: "Monitoring", type: "Control" },
      { clause: "9.1.2", title: "Evaluation of compliance", type: "Control" },
    ]);
    await createComplianceControlRepository().upsertCatalogue(toolkit, rows);
    await request(ctx!.app).post("/api/v1/compliance/toolkits").send({ name: toolkit }).expect(201);

    // A Super Admin receives alerts for clauses with no RACI owner.
    const admin = await createUserRepository().create({
      type: "Internal",
      firstName: "Adam",
      lastName: "Admin",
      email: "adam.admin@example.com",
      reference: "USR-LCADMIN",
      passwordHash: await hashPassword("Password1!"),
      systemPasswordStatus: "blocked",
      systemAccessPeriod: "Full time",
      systemAccessExpires: null,
      createdBy: null,
    });
    await getOrganisationMembershipModel().create({
      organizationId: DEV_STUB_ORGANIZATION_ID,
      userId: admin.id,
      role: "Super Admin",
      accessStatus: "Active",
      createdOn: new Date(),
    });

    // Baseline evaluation: first run notifies nobody.
    const baseline = await request(ctx!.app).get("/api/v1/live-compliance/modules/compliance");
    expect(baseline.body.data.clauses.find((c: { clause: string }) => c.clause === "9.1.2")).toMatchObject({
      status: "not",
    });
    expect(await getNotificationModel().countDocuments({ screenIdentifier: "live-compliance" })).toBe(0);

    const { port } = server!.address() as AddressInfo;
    const stream = openStream(port);
    await stream.waitFor("ready");
    expect(stream.meta()).toEqual({ status: 200, contentType: "text/event-stream; charset=utf-8" });

    // A plain module write — no explicit recalc call anywhere.
    const duty = await request(ctx!.app)
      .post("/api/v1/legal-register/duties")
      .send({ name: "Waste duty of care", legislation: "EPA 1990 s34" });
    expect(duty.status).toBe(201);

    const changed = await stream.waitFor("clause.status.changed");
    expect(changed.data).toMatchObject({ standard: "ISO 14001", clause: "9.1.2", from: "not", to: "prog" });
    expect(await stream.waitFor("advice.updated")).toMatchObject({
      data: { newAdviceIds: [`duty-${duty.body.data.id}`] },
    });
    const health = await stream.waitFor("health.updated");
    expect(health.data).toMatchObject({ source: "event" });

    // Medium advice → in-app notification for the admin (no email channel).
    let notifications: Array<Record<string, unknown>> = [];
    for (let i = 0; i < 50 && !notifications.length; i++) {
      notifications = await getNotificationModel().find({ screenIdentifier: "live-compliance" }).lean();
      if (!notifications.length) await new Promise((r) => setTimeout(r, 20));
    }
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      recipientUserId: admin.id,
      screenIdentifier: "live-compliance",
      referenceModuleId: "9.1.2",
      channels: ["in_app"],
      createdBy: "system",
    });
    expect(String(notifications[0]!.title)).toContain("Waste duty of care");

    stream.close();
  }, 30_000);
});
