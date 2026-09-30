import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createTestApp, type TestContext } from "./helpers/create-test-app";
import { getSupplierModel } from "../src/modules/suppliers/repositories/supplier.model";
import { DEV_STUB_ORGANIZATION_ID } from "../src/security";

const otherOrgId = "000000000000000000000099";

describe("Suppliers HTTP", () => {
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
    await getSupplierModel().deleteMany({});
  });

  const createPayload = {
    name: "Acme Facilities Ltd",
    accountManager: "Jane Contact",
    accountNumber: "ACC-1001",
    email: "ops@acme.example",
    serviceProvision: "Facilities maintenance and cleaning",
    contractValue: 25000,
    contractStartDate: "2026-01-15",
    businessUnitId: "cccccccccccccccccccccccc",
    buyerId: "bbbbbbbbbbbbbbbbbbbbbbbb",
    reviewDate: "2026-06-01",
  };

  it("POST /api/v1/suppliers registers a supplier", async () => {
    const response = await request(ctx!.app)
      .post("/api/v1/suppliers")
      .send(createPayload);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      name: createPayload.name,
      organizationId: DEV_STUB_ORGANIZATION_ID,
      isCompliant: false,
      accountManager: createPayload.accountManager,
      email: "ops@acme.example",
    });
    expect(response.body.data.reference).toMatch(/^SUP-/);
  });

  it("POST rejects missing required fields", async () => {
    const missing = await request(ctx!.app)
      .post("/api/v1/suppliers")
      .send({ name: "Only name" });
    expect(missing.status).toBe(400);
    expect(missing.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("creates as compliant when SLA files are included", async () => {
    const response = await request(ctx!.app)
      .post("/api/v1/suppliers")
      .send({
        ...createPayload,
        slaFiles: [{ fileName: "sla.pdf", url: "https://files.example/sla.pdf" }],
      });
    expect(response.status).toBe(201);
    expect(response.body.data.isCompliant).toBe(true);
    expect(response.body.data.slaFiles).toHaveLength(1);
  });

  it("GET list supports search, compliance filter, and pagination", async () => {
    await request(ctx!.app).post("/api/v1/suppliers").send(createPayload);
    await request(ctx!.app)
      .post("/api/v1/suppliers")
      .send({
        ...createPayload,
        name: "Beta Logistics",
        email: "hello@beta.example",
        accountNumber: "ACC-2002",
        slaFiles: [{ fileName: "sla.pdf" }],
      });

    const listed = await request(ctx!.app).get("/api/v1/suppliers").query({
      search: "Acme",
      page: 1,
      pageSize: 10,
    });
    expect(listed.status).toBe(200);
    expect(listed.body.data.total).toBe(1);
    expect(listed.body.data.items[0].name).toContain("Acme");

    const compliant = await request(ctx!.app).get("/api/v1/suppliers").query({
      isCompliant: "true",
    });
    expect(compliant.status).toBe(200);
    expect(compliant.body.data.total).toBe(1);
    expect(compliant.body.data.items[0].name).toBe("Beta Logistics");
  });

  it("enforces organisation isolation on get by id", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/suppliers")
      .send(createPayload);
    const id = created.body.data.id as string;

    await getSupplierModel().updateOne(
      { _id: id },
      { $set: { organizationId: otherOrgId } }
    );

    const response = await request(ctx!.app).get(`/api/v1/suppliers/${id}`);
    expect(response.status).toBe(404);
  });

  it("supports SLA/contract/onboarding and KPI sub-resources", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/suppliers")
      .send(createPayload);
    const id = created.body.data.id as string;

    const sla = await request(ctx!.app)
      .post(`/api/v1/suppliers/${id}/slas`)
      .send({ files: [{ fileName: "sla-v1.pdf" }] });
    expect(sla.status).toBe(200);
    expect(sla.body.data.isCompliant).toBe(true);
    expect(sla.body.data.slaFiles).toHaveLength(1);
    const slaId = sla.body.data.slaFiles[0].id as string;

    const contract = await request(ctx!.app)
      .post(`/api/v1/suppliers/${id}/contracts`)
      .send({ files: [{ fileName: "contract.pdf" }] });
    expect(contract.status).toBe(200);
    expect(contract.body.data.contractFiles).toHaveLength(1);

    const onboard = await request(ctx!.app)
      .post(`/api/v1/suppliers/${id}/onboarding-files`)
      .send({ files: [{ fileName: "onboard.pdf" }] });
    expect(onboard.status).toBe(200);
    expect(onboard.body.data.onboardingFiles).toHaveLength(1);
    expect(onboard.body.data.isCompliant).toBe(true);

    const kpi = await request(ctx!.app)
      .post(`/api/v1/suppliers/${id}/kpi-objectives`)
      .send({ value: "Response within 4 hours" });
    expect(kpi.status).toBe(201);
    expect(kpi.body.data.kpiObjectives).toHaveLength(1);
    const kpiId = kpi.body.data.kpiObjectives[0].id as string;

    const removeKpi = await request(ctx!.app).delete(
      `/api/v1/suppliers/${id}/kpi-objectives/${kpiId}`
    );
    expect(removeKpi.status).toBe(200);
    expect(removeKpi.body.data.kpiObjectives).toHaveLength(0);

    const removeSla = await request(ctx!.app).delete(
      `/api/v1/suppliers/${id}/slas/${slaId}`
    );
    expect(removeSla.status).toBe(200);
    expect(removeSla.body.data.slaFiles).toHaveLength(0);
    expect(removeSla.body.data.isCompliant).toBe(true);
  });

  it("PATCH updates fields and soft-delete hides the supplier", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/suppliers")
      .send(createPayload);
    const id = created.body.data.id as string;

    const updated = await request(ctx!.app)
      .patch(`/api/v1/suppliers/${id}`)
      .send({ name: "Acme Facilities Updated", contractValue: 30000 });
    expect(updated.status).toBe(200);
    expect(updated.body.data.name).toBe("Acme Facilities Updated");
    expect(updated.body.data.contractValue).toBe(30000);

    const deleted = await request(ctx!.app).delete(`/api/v1/suppliers/${id}`);
    expect(deleted.status).toBe(200);

    const missing = await request(ctx!.app).get(`/api/v1/suppliers/${id}`);
    expect(missing.status).toBe(404);

    const listed = await request(ctx!.app).get("/api/v1/suppliers");
    expect(listed.body.data.total).toBe(0);
  });

  it("GET /stats returns procurement and compliance aggregates", async () => {
    await request(ctx!.app).post("/api/v1/suppliers").send(createPayload);
    await request(ctx!.app)
      .post("/api/v1/suppliers")
      .send({
        ...createPayload,
        name: "Gamma Soft",
        accountNumber: "ACC-3003",
        email: "g@example.com",
        contractValue: 10000,
        contractFiles: [{ fileName: "c.pdf" }],
      });

    const stats = await request(ctx!.app).get("/api/v1/suppliers/stats");
    expect(stats.status).toBe(200);
    expect(stats.body.data.procurementValue).toBe(35000);
    expect(stats.body.data.supplierCompliance.compliant).toBe(1);
    expect(stats.body.data.supplierCompliance.inCompliant).toBe(1);
    expect(stats.body.data.supplierCompliance.percentage).toBe(50);
    expect(stats.body.data.supplierCompliance.riskLevel).toBe("Unsecure");
    expect(stats.body.data.supplierIncidents).toMatchObject({
      totalIncidents: expect.any(Number),
      openIncidents: expect.any(Number),
      resolvedIncidents: expect.any(Number),
    });
  });

  it("does not allow changing business unit via update body", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/suppliers")
      .send(createPayload);
    const id = created.body.data.id as string;

    const updated = await request(ctx!.app)
      .patch(`/api/v1/suppliers/${id}`)
      .send({
        name: "Still same unit",
        businessUnitId: "dddddddddddddddddddddddd",
      });
    // Zod strips unknown keys by default? Check - if businessUnitId not in schema, strip or error
    expect([200, 400]).toContain(updated.status);
    if (updated.status === 200) {
      expect(updated.body.data.businessUnitId).toBe(
        createPayload.businessUnitId
      );
    }
  });
});
