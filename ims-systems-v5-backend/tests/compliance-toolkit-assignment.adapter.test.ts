import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, type TestContext } from "./helpers/create-test-app";
import { createComplianceToolkitAdapter } from "../src/modules/users";
import { createComplianceIamGrantAdapter } from "../src/modules/compliance";
import { createOrganisationRepository } from "../src/modules/organisation/repositories/organisation.repository";
import { getOrganisationModel } from "../src/modules/organisation/repositories/organisation.model";
import { createOrganisationMembershipRepository } from "../src/modules/organisation/repositories/organisation-membership.repository";
import { getOrganisationMembershipModel } from "../src/modules/organisation/repositories/organisation-membership.model";

async function seedOrganisationWithMember() {
  const org = await createOrganisationRepository().create({
    reference: `ORG-TK-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    createdBy: "tester",
    createdOn: new Date(),
    data: {
      name: "Toolkit Org",
      industry: "Technology",
      sizeOfOrganisation: 10,
      officeEmail: "office@toolkit.example",
      contactNumber: "+44 20 7946 0000",
      address: {
        line1: "1 Toolkit Street",
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
    { _id: org.id },
    { $set: { "licences.complianceTools": ["ISO 9001", "ISO 27001"] } }
  );
  await createOrganisationMembershipRepository().create({
    organizationId: org.id,
    userId: "member-1",
    role: "Super Admin",
    createdOn: new Date(),
  });
  return org.id;
}

describe("Toolkit assignment adapters (U-07 / N-10)", () => {
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

  it("assigns licensed toolkits to the membership and replaces on reassign", async () => {
    const orgId = await seedOrganisationWithMember();
    const adapter = createComplianceToolkitAdapter();

    await adapter.assignToolkits({
      organizationId: orgId,
      userId: "member-1",
      toolkitIds: ["ISO 9001"],
    });
    let membership =
      await createOrganisationMembershipRepository().findByUserAndOrg(
        "member-1",
        orgId
      );
    expect(membership?.complianceToolkits).toEqual(["ISO 9001"]);

    await adapter.assignToolkits({
      organizationId: orgId,
      userId: "member-1",
      toolkitIds: ["ISO 27001", "ISO 9001"],
    });
    membership =
      await createOrganisationMembershipRepository().findByUserAndOrg(
        "member-1",
        orgId
      );
    expect(membership?.complianceToolkits).toEqual(["ISO 27001", "ISO 9001"]);
  });

  it("rejects toolkits the organisation is not licensed for", async () => {
    const orgId = await seedOrganisationWithMember();
    const adapter = createComplianceToolkitAdapter();

    await expect(
      adapter.assignToolkits({
        organizationId: orgId,
        userId: "member-1",
        toolkitIds: ["ISO 14001"],
      })
    ).rejects.toThrow(/not licensed/);
  });

  it("rejects assignment for a non-member", async () => {
    const orgId = await seedOrganisationWithMember();
    const adapter = createComplianceToolkitAdapter();

    await expect(
      adapter.assignToolkits({
        organizationId: orgId,
        userId: "ghost",
        toolkitIds: ["ISO 9001"],
      })
    ).rejects.toThrow(/not a member/);
  });

  it("IAM grant adds the provisioned toolkit to the actor's membership", async () => {
    const orgId = await seedOrganisationWithMember();
    const grant = createComplianceIamGrantAdapter();

    await grant.grantToolkitAccess({
      organizationId: orgId,
      toolkitName: "ISO 9001" as never,
      actorId: "member-1",
    });
    await grant.grantToolkitAccess({
      organizationId: orgId,
      toolkitName: "ISO 9001" as never,
      actorId: "member-1",
    });

    const membership =
      await createOrganisationMembershipRepository().findByUserAndOrg(
        "member-1",
        orgId
      );
    expect(membership?.complianceToolkits).toEqual(["ISO 9001"]);
  });
});
