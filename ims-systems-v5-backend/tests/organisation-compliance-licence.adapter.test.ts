import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, type TestContext } from "./helpers/create-test-app";
import { createOrganisationComplianceLicenceAdapter } from "../src/modules/compliance";
import { createOrganisationRepository } from "../src/modules/organisation/repositories/organisation.repository";
import { getOrganisationModel } from "../src/modules/organisation/repositories/organisation.model";

async function seedOrg(name: string) {
  const organisations = createOrganisationRepository();
  return organisations.create({
    reference: `ORG-${Date.now().toString(36).toUpperCase()}`,
    createdBy: "test",
    createdOn: new Date(),
    data: {
      name,
      industry: "IT",
      sizeOfOrganisation: 10,
      officeEmail: `${name.replace(/\s+/g, "-").toLowerCase()}@example.local`,
      contactNumber: "+44 20 7000 0000",
      address: {
        line1: "1 Road",
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
    },
  });
}

describe("OrganisationComplianceLicenceAdapter (C-01)", () => {
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

  it("lists only catalogue toolkits from org.licences.complianceTools", async () => {
    const created = await seedOrg("Licensed Org");

    await getOrganisationModel().updateOne(
      { _id: created.id },
      {
        $set: {
          "licences.complianceTools": [
            "ISO 27001",
            "Not A Real Toolkit",
            "ISO 27001",
            "DSPT",
          ],
        },
      }
    );

    const licences = createOrganisationComplianceLicenceAdapter();
    const listed = await licences.listLicensedToolkits(created.id);
    expect(listed).toEqual(["ISO 27001", "DSPT"]);
    expect(await licences.isToolkitLicensed(created.id, "ISO 27001")).toBe(
      true
    );
    expect(await licences.isToolkitLicensed(created.id, "ISO 9001")).toBe(
      false
    );
  });

  it("returns empty when complianceTools is empty", async () => {
    const created = await seedOrg("Empty Licences Org");
    const licences = createOrganisationComplianceLicenceAdapter();
    expect(await licences.listLicensedToolkits(created.id)).toEqual([]);
    expect(await licences.isToolkitLicensed(created.id, "DSPT")).toBe(false);
  });

  it("returns empty when organisation is missing", async () => {
    const licences = createOrganisationComplianceLicenceAdapter();
    expect(
      await licences.listLicensedToolkits("000000000000000000000099")
    ).toEqual([]);
  });
});
