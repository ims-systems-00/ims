import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, type TestContext } from "./helpers/create-test-app";
import { createOrganisationMembershipLookupAdapter } from "../src/modules/users";
import { createOrganisationMembershipRepository } from "../src/modules/organisation/repositories/organisation-membership.repository";
import { getOrganisationMembershipModel } from "../src/modules/organisation/repositories/organisation-membership.model";

describe("OrganisationMembershipLookupAdapter", () => {
  let ctx: TestContext | undefined;

  beforeAll(async () => {
    ctx = await createTestApp();
  }, 60_000);

  afterAll(async () => {
    if (ctx) await ctx.cleanup();
  });

  beforeEach(async () => {
    await getOrganisationMembershipModel().deleteMany({});
  });

  it("lists and finds only memberships for the requested organisation", async () => {
    const memberships = createOrganisationMembershipRepository();
    await memberships.create({
      organizationId: "org-a",
      userId: "user-a",
      role: "Super Admin",
      jobTitle: "Owner",
      createdOn: new Date("2024-01-01T00:00:00.000Z"),
    });
    await memberships.create({
      organizationId: "org-b",
      userId: "user-b",
      role: "Basic",
      createdOn: new Date("2024-01-01T00:00:00.000Z"),
    });

    const lookup = createOrganisationMembershipLookupAdapter();
    const listed = await lookup.listByOrganization("org-a");
    expect(listed).toHaveLength(1);
    expect(listed[0]).toMatchObject({
      userId: "user-a",
      role: "Super Admin",
      jobTitle: "Owner",
    });

    const found = await lookup.findByOrganizationAndUser("org-a", "user-a");
    expect(found?.userId).toBe("user-a");

    const missing = await lookup.findByOrganizationAndUser("org-a", "user-b");
    expect(missing).toBeNull();
  });
});
