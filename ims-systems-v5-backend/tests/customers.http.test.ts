import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createTestApp, type TestContext } from "./helpers/create-test-app";
import { getCustomerModel } from "../src/modules/customers/repositories/customer.model";
import {
  DEV_STUB_IDENTITY,
  DEV_STUB_ORGANIZATION_ID,
} from "../src/security";

const otherOrgId = "000000000000000000000099";

describe("Customers HTTP", () => {
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
    await getCustomerModel().deleteMany({});
  });

  const createPayload = {
    name: "Acme Care Ltd",
    primaryEmail: "hello@acme.example",
    accountManager: DEV_STUB_IDENTITY.subjectId,
    businessUnitId: "cccccccccccccccccccccccc",
    contractValue: 12000,
    stage: "Prospect",
    source: "Referral",
    phoneNumber: "+441234567890",
    primaryContact: "Jane Contact",
  };

  it("POST /api/v1/customers registers a customer", async () => {
    const response = await request(ctx!.app)
      .post("/api/v1/customers")
      .send(createPayload);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      name: createPayload.name,
      organizationId: DEV_STUB_ORGANIZATION_ID,
      stage: "Prospect",
      status: "Open",
      primaryEmail: "hello@acme.example",
    });
    expect(response.body.data.reference).toMatch(/^CUS-/);
  });

  it("POST rejects missing required fields", async () => {
    const missing = await request(ctx!.app)
      .post("/api/v1/customers")
      .send({ name: "Only name" });
    expect(missing.status).toBe(400);
    expect(missing.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("POST rejects Live without contract dates", async () => {
    const response = await request(ctx!.app)
      .post("/api/v1/customers")
      .send({
        ...createPayload,
        stage: "Live",
      });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("POST accepts Live with contract dates", async () => {
    const response = await request(ctx!.app)
      .post("/api/v1/customers")
      .send({
        ...createPayload,
        stage: "Live",
        contractStartDate: "2026-01-01",
        contractEndDate: "2027-01-01",
        reviewDate: "2026-06-01",
        accountNumber: "ACC-100",
      });
    expect(response.status).toBe(201);
    expect(response.body.data.stage).toBe("Live");
  });

  it("GET list supports search, stage filter, and pagination", async () => {
    await request(ctx!.app).post("/api/v1/customers").send(createPayload);
    await request(ctx!.app)
      .post("/api/v1/customers")
      .send({
        ...createPayload,
        name: "Beta Health",
        primaryEmail: "ops@beta.example",
        stage: "Warm lead",
      });

    const listed = await request(ctx!.app).get("/api/v1/customers").query({
      search: "Acme",
      page: 1,
      pageSize: 10,
    });
    expect(listed.status).toBe(200);
    expect(listed.body.data.total).toBe(1);
    expect(listed.body.data.items[0].name).toContain("Acme");

    const byStage = await request(ctx!.app).get("/api/v1/customers").query({
      stages: "Warm lead",
    });
    expect(byStage.status).toBe(200);
    expect(byStage.body.data.total).toBe(1);
    expect(byStage.body.data.items[0].stage).toBe("Warm lead");
  });

  it("GET myCustomers filters to session account manager", async () => {
    await request(ctx!.app).post("/api/v1/customers").send(createPayload);
    await request(ctx!.app)
      .post("/api/v1/customers")
      .send({
        ...createPayload,
        name: "Other Managed",
        primaryEmail: "other@example.com",
        accountManager: "other-manager-id",
      });

    const mine = await request(ctx!.app).get("/api/v1/customers").query({
      myCustomers: "true",
    });
    expect(mine.status).toBe(200);
    expect(mine.body.data.total).toBe(1);
    expect(mine.body.data.items[0].accountManager).toBe(
      DEV_STUB_IDENTITY.subjectId
    );
  });

  it("GET by id is organization-scoped", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/customers")
      .send(createPayload);
    const id = created.body.data.id as string;

    const ok = await request(ctx!.app).get(`/api/v1/customers/${id}`);
    expect(ok.status).toBe(200);
    expect(ok.body.data.name).toBe("Acme Care Ltd");

    await getCustomerModel().updateOne(
      { _id: id },
      { $set: { organizationId: otherOrgId } }
    );

    const blocked = await request(ctx!.app).get(`/api/v1/customers/${id}`);
    expect(blocked.status).toBe(404);
  });

  it("PATCH updates stage and appends attachments", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/customers")
      .send({
        ...createPayload,
        attachments: [{ fileName: "brief.pdf" }],
      });
    const id = created.body.data.id as string;

    const updated = await request(ctx!.app)
      .patch(`/api/v1/customers/${id}`)
      .send({
        stage: "Qualified",
        probability: 40,
        attachments: [{ fileName: "proposal.pdf" }],
      });
    expect(updated.status).toBe(200);
    expect(updated.body.data.stage).toBe("Qualified");
    expect(updated.body.data.probability).toBe(40);
    expect(updated.body.data.attachments).toHaveLength(2);
  });

  it("PATCH to Lost requires reasonForLoss", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/customers")
      .send(createPayload);
    const id = created.body.data.id as string;

    const rejected = await request(ctx!.app)
      .patch(`/api/v1/customers/${id}`)
      .send({ status: "Lost" });
    expect(rejected.status).toBe(400);

    const ok = await request(ctx!.app)
      .patch(`/api/v1/customers/${id}`)
      .send({ status: "Lost", reasonForLoss: "Budget withdrawn" });
    expect(ok.status).toBe(200);
    expect(ok.body.data.status).toBe("Lost");
    expect(ok.body.data.reasonForLoss).toBe("Budget withdrawn");
  });

  it("DELETE soft-deletes customer", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/customers")
      .send(createPayload);
    const id = created.body.data.id as string;

    const deleted = await request(ctx!.app).delete(`/api/v1/customers/${id}`);
    expect(deleted.status).toBe(200);

    const missing = await request(ctx!.app).get(`/api/v1/customers/${id}`);
    expect(missing.status).toBe(404);

    const listed = await request(ctx!.app).get("/api/v1/customers");
    expect(listed.body.data.total).toBe(0);
  });

  it("DELETE attachment removes one file", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/customers")
      .send({
        ...createPayload,
        attachments: [
          { fileName: "a.pdf" },
          { fileName: "b.pdf" },
        ],
      });
    const id = created.body.data.id as string;
    const attachmentId = created.body.data.attachments[0].id as string;

    const removed = await request(ctx!.app).delete(
      `/api/v1/customers/${id}/attachments/${attachmentId}`
    );
    expect(removed.status).toBe(200);
    expect(removed.body.data.attachments).toHaveLength(1);
    expect(removed.body.data.attachments[0].fileName).toBe("b.pdf");
  });

  it("GET overviews returns invoice/incident shape", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/customers")
      .send(createPayload);
    const id = created.body.data.id as string;

    const overview = await request(ctx!.app).get(
      `/api/v1/customers/${id}/overviews`
    );
    expect(overview.status).toBe(200);
    expect(overview.body.data).toMatchObject({
      totalInvoices: 0,
      totalIncidents: [],
      totalInvoiceAmount: [],
    });
  });

  it("GET manager overview is self-only", async () => {
    await request(ctx!.app).post("/api/v1/customers").send(createPayload);

    const self = await request(ctx!.app).get(
      `/api/v1/customers/analytics/manager-overview/${DEV_STUB_IDENTITY.subjectId}`
    );
    expect(self.status).toBe(200);
    expect(self.body.data.customerAnalysis.length).toBeGreaterThanOrEqual(1);
    expect(self.body.data).toHaveProperty("contractStartedThisMonth");
    expect(self.body.data).toHaveProperty("interactions");

    const other = await request(ctx!.app).get(
      "/api/v1/customers/analytics/manager-overview/other-manager"
    );
    expect(other.status).toBe(403);
  });
});
