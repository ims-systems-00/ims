import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createTestApp, type TestContext } from "./helpers/create-test-app";
import { getOrganisationModel } from "../src/modules/organisation/repositories/organisation.model";
import { getOrganisationMembershipModel } from "../src/modules/organisation/repositories/organisation-membership.model";
import { DEV_STUB_ORGANIZATION_ID } from "../src/security";

const createPayload = {
  name: "Acme Systems Ltd",
  industry: "Information technology",
  sizeOfOrganisation: 42,
  officeEmail: "ops@acme.example",
  contactNumber: "+44 20 7000 0000",
  address: {
    line1: "10 Example Road",
    line2: "",
    city: "London",
    county: "Greater London",
    postCode: "E1 6AN",
  },
  country: {
    name: "United Kingdom",
    code: "GB",
    currency: "GBP",
    phoneCode: 44,
  },
  referralSource: null,
};

describe("Organisation HTTP", () => {
  let ctx: TestContext | undefined;

  beforeAll(async () => {
    ctx = await createTestApp();
  }, 60_000);

  afterAll(async () => {
    if (ctx) await ctx.cleanup();
  });

  beforeEach(async () => {
    await getOrganisationModel().deleteMany({});
    await getOrganisationMembershipModel().deleteMany({});
  });

  it("POST /api/v1/organisations creates org + Super Admin membership", async () => {
    const response = await request(ctx!.app)
      .post("/api/v1/organisations")
      .send(createPayload);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.organisation).toMatchObject({
      name: "Acme Systems Ltd",
      industry: "Information technology",
      officeEmail: "ops@acme.example",
      isCustomer: false,
      status: "Running",
    });
    expect(response.body.data.organisation.reference).toMatch(/^ORG-/);
    expect(response.body.data.organisation.licences.superUser).toEqual({
      allocated: 1,
      used: 1,
    });
    expect(response.body.data.membership).toMatchObject({
      userId: "dev-stub-user",
      role: "Super Admin",
      organizationId: response.body.data.organisation.id,
    });
  });

  it("GET /api/v1/organisations/current bootstraps the stub org when missing", async () => {
    const response = await request(ctx!.app).get("/api/v1/organisations/current");
    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(DEV_STUB_ORGANIZATION_ID);
    expect(response.body.data.name).toBe("Demo Organisation");
    expect(response.body.data.reference).toBe("ORG-DEV-001");
    expect(response.body.data.membership.role).toBe("Super Admin");
  });

  it("honours x-org-id for newly created organisations", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/organisations")
      .send(createPayload);
    const orgId = created.body.data.organisation.id as string;

    const current = await request(ctx!.app)
      .get("/api/v1/organisations/current")
      .set("x-org-id", orgId);

    expect(current.status).toBe(200);
    expect(current.body.data.id).toBe(orgId);
    expect(current.body.data.name).toBe("Acme Systems Ltd");
  });
});
