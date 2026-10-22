import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, type TestContext } from "./helpers/create-test-app";
import { createOrganisationGroupLicenceAdapter } from "../src/modules/functional-units";
import { InsufficientGroupLicenceError } from "../src/modules/functional-units";
import { createOrganisationRepository } from "../src/modules/organisation/repositories/organisation.repository";
import { getOrganisationModel } from "../src/modules/organisation/repositories/organisation.model";

async function seedOrganisation(groups: { allocated: number; used: number }) {
  const created = await createOrganisationRepository().create({
    reference: `ORG-FU-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    createdBy: "tester",
    createdOn: new Date(),
    data: {
      name: "Licence Org",
      industry: "Technology",
      sizeOfOrganisation: 10,
      officeEmail: "office@licence.example",
      contactNumber: "+44 20 7946 0000",
      address: {
        line1: "1 Licence Street",
        city: "London",
        county: "London",
        postCode: "E1 1AA",
      },
      country: {
        name: "United Kingdom",
        code: "GB",
        currency: "GBP",
        phoneCode: 44,
      },
    },
  });
  await getOrganisationModel().updateOne(
    { _id: created.id },
    { $set: { "licences.groups": groups } }
  );
  return created.id;
}

describe("OrganisationGroupLicenceAdapter (FU-01)", () => {
  let ctx: TestContext | undefined;

  beforeAll(async () => {
    ctx = await createTestApp();
  }, 60_000);

  afterAll(async () => {
    if (ctx) await ctx.cleanup();
  });

  beforeEach(async () => {
    await getOrganisationModel().deleteMany({});
  });

  it("allows creation while allocation remains, then blocks at the cap", async () => {
    const orgId = await seedOrganisation({ allocated: 1, used: 0 });
    const adapter = createOrganisationGroupLicenceAdapter();

    await expect(adapter.assertCanCreateUnit(orgId)).resolves.toBeUndefined();
    await adapter.consumeUnitLicence(orgId);

    await expect(adapter.assertCanCreateUnit(orgId)).rejects.toBeInstanceOf(
      InsufficientGroupLicenceError
    );
  });

  it("allows creation when no allocation is configured, but still counts use", async () => {
    const orgId = await seedOrganisation({ allocated: 0, used: 0 });
    const adapter = createOrganisationGroupLicenceAdapter();

    await expect(adapter.assertCanCreateUnit(orgId)).resolves.toBeUndefined();
    await adapter.consumeUnitLicence(orgId);
    await expect(adapter.assertCanCreateUnit(orgId)).resolves.toBeUndefined();

    const org = await createOrganisationRepository().findById(orgId);
    expect(org?.licences.groups.used).toBe(1);
  });

  it("rejects when the organisation does not exist", async () => {
    const adapter = createOrganisationGroupLicenceAdapter();
    await expect(
      adapter.assertCanCreateUnit("64b64c2f4f4f4f4f4f4f4f4f")
    ).rejects.toBeInstanceOf(InsufficientGroupLicenceError);
    await expect(adapter.assertCanCreateUnit("not-an-org")).rejects.toBeInstanceOf(
      InsufficientGroupLicenceError
    );
  });
});
