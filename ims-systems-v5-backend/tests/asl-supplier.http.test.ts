import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createTestApp, type TestContext } from "./helpers/create-test-app";
import { getAslSettingsModel } from "../src/modules/supplier/repositories/asl-settings.model";
import { getAslSupplierModel } from "../src/modules/supplier/repositories/asl-supplier.model";
import { DEV_STUB_ORGANIZATION_ID } from "../src/security";
import { DEFAULT_ASL_CRITERIA } from "../src/modules/supplier/types";

describe("ASL Supplier HTTP (/api/v1/supplier)", () => {
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
    await getAslSupplierModel().deleteMany({});
    await getAslSettingsModel().deleteMany({});
  });

  it("GET/PUT /settings returns and updates org settings", async () => {
    const get = await request(ctx!.app).get("/api/v1/supplier/settings");
    expect(get.status).toBe(200);
    expect(get.body.success).toBe(true);
    expect(get.body.data.organizationId).toBe(DEV_STUB_ORGANIZATION_ID);
    expect(get.body.data.lead).toBe(30);

    const put = await request(ctx!.app)
      .put("/api/v1/supplier/settings")
      .send({
        lead: 45,
        criteria: DEFAULT_ASL_CRITERIA,
      });
    expect(put.status).toBe(200);
    expect(put.body.data.lead).toBe(45);
  });

  it("POST create + GET list with filters", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/supplier")
      .send({
        name: "ASL Smoke Co",
        email: "asl@example.com",
        crit: "Critical",
        cat: "Raw materials",
      });
    expect(created.status).toBe(201);
    expect(created.body.data.status).toBe("Prospective");
    expect(created.body.data.reference).toMatch(/^ASL-/);

    const list = await request(ctx!.app).get(
      "/api/v1/supplier?crit=Critical&search=Smoke"
    );
    expect(list.status).toBe(200);
    expect(list.body.data.items.length).toBeGreaterThanOrEqual(1);
    expect(list.body.data.items[0].name).toContain("Smoke");
  });

  it("GET /auditor-pack?format=html returns print-ready HTML", async () => {
    await request(ctx!.app).post("/api/v1/supplier").send({
      name: "Pack Co",
      email: "pack@example.com",
    });

    const pack = await request(ctx!.app).get(
      "/api/v1/supplier/auditor-pack?format=html"
    );
    expect(pack.status).toBe(200);
    expect(pack.headers["content-type"]).toMatch(/html/);
    expect(pack.text).toContain("auditor pack");
    expect(pack.text).toContain("Pack Co");
  });
});
