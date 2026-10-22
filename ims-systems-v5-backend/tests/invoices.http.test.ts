import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createTestApp, type TestContext } from "./helpers/create-test-app";
import { DEV_STUB_ORGANIZATION_ID } from "../src/security";
import { createOrganisationRepository } from "../src/modules/organisation/repositories/organisation.repository";
import { createCustomerRepository } from "../src/modules/customers/repositories/customer.repository";
import { InvoiceModel, InvoiceCounterModel } from "../src/modules/invoices/repositories/invoice.model";

let ctx: TestContext;
let customerId: string;

async function seed() {
  await createOrganisationRepository().create({
    id: DEV_STUB_ORGANIZATION_ID,
    reference: "ORG-TEST-001",
    createdBy: "test",
    createdOn: new Date(),
    data: {
      name: "Test Organisation",
      industry: "Technology",
      sizeOfOrganisation: 10,
      officeEmail: "office@test.example",
      contactNumber: "+44 20 7946 0000",
      address: { line1: "1 Test Street", city: "London", county: "London", postCode: "E1 1AA" },
      country: { name: "United Kingdom", code: "GB", currency: "GBP", phoneCode: 44 },
    },
  });
  const customer = await createCustomerRepository().create(DEV_STUB_ORGANIZATION_ID, {
    reference: "CUS-1",
    name: "Acme Care",
    stage: "Live",
    status: "Open",
    probability: 100,
    primaryEmail: "pat@acme.test",
    primaryContact: "Pat",
    contractValue: 0,
    createdBy: "test",
    createdOn: new Date(),
  } as never);
  customerId = customer.id;
}

describe("Invoices HTTP", () => {
  beforeAll(async () => {
    ctx = await createTestApp();
  });
  afterAll(async () => {
    await ctx.cleanup();
  });
  beforeEach(async () => {
    await InvoiceModel.deleteMany({});
    await InvoiceCounterModel.deleteMany({});
    await seed();
  });

  it("creates, lists, sends (no contacts guard), marks paid, downloads", async () => {
    const created = await request(ctx.app)
      .post("/api/v1/invoices")
      .send({
        customerId,
        dueDate: "2026-11-01",
        entries: [{ item: "Service", unitPrice: 100, units: 2, vatRate: 20 }],
      })
      .expect(200);
    const invoice = created.body.data;
    expect(invoice.reference).toBe("INV-1");
    expect(invoice.calculations.total).toBe(240);

    const list = await request(ctx.app)
      .get(`/api/v1/invoices?customerId=${customerId}`)
      .expect(200);
    expect(list.body.data.total).toBe(1);

    await request(ctx.app)
      .post(`/api/v1/invoices/${invoice.id}/mark-paid`)
      .expect(400);

    const sent = await request(ctx.app)
      .post(`/api/v1/invoices/${invoice.id}/send`)
      .expect(200);
    expect(sent.body.data.status).toBe("Sent");
    expect(sent.body.data.emails[0].email).toBe("pat@acme.test");

    const paid = await request(ctx.app)
      .post(`/api/v1/invoices/${invoice.id}/mark-paid`)
      .expect(200);
    expect(paid.body.data.status).toBe("Paid");

    const dl = await request(ctx.app)
      .get(`/api/v1/invoices/${invoice.id}/download`)
      .expect(200);
    expect(
      Buffer.from(dl.body.data.contentBase64, "base64").subarray(0, 4).toString(),
    ).toBe("%PDF");
  });
});
