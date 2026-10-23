import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createTestApp, type TestContext } from "./helpers/create-test-app";
import { getOrganisationModel } from "../src/modules/organisation/repositories/organisation.model";
import { getOrganisationMembershipModel } from "../src/modules/organisation/repositories/organisation-membership.model";
import { getUserModel } from "../src/modules/users/repositories/user.model";
import { createUserRepository } from "../src/modules/users/repositories/user.repository";
import { hashPassword } from "../src/modules/users/services/password";

const createOrgPayload = {
  name: "Logo Org Ltd",
  industry: "Technology",
  sizeOfOrganisation: 12,
  officeEmail: "ops@logo.example",
  contactNumber: "+44 20 7000 0000",
  address: {
    line1: "1 Logo Road",
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

async function seedUser(email: string) {
  return createUserRepository().create({
    type: "Internal",
    firstName: "Image",
    lastName: "Owner",
    email,
    reference: `USR-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
    passwordHash: await hashPassword("Password1!"),
    systemPasswordStatus: "blocked",
    systemAccessPeriod: "Full time",
    systemAccessExpires: null,
    createdBy: null,
  });
}

describe("Profile picture + organisation logo HTTP", () => {
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
    await getUserModel().deleteMany({});
  });

  it("PUT /organisations/current/logo stores logo + storage meta and can clear it", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/organisations")
      .send(createOrgPayload);
    expect(created.status).toBe(201);
    const orgId = created.body.data.organisation.id as string;

    const updated = await request(ctx!.app)
      .put("/api/v1/organisations/current/logo")
      .set("x-org-id", orgId)
      .send({
        logoSrc: "https://cdn.example/logo.png",
        logoStorage: {
          bucket: "org-bucket",
          key: "general/logo.png",
          fileName: "logo.png",
        },
      });
    expect(updated.status).toBe(200);
    expect(updated.body.data.logoSrc).toBe("https://cdn.example/logo.png");
    expect(updated.body.data.logoStorage).toEqual({
      bucket: "org-bucket",
      key: "general/logo.png",
      fileName: "logo.png",
    });

    const current = await request(ctx!.app)
      .get("/api/v1/organisations/current")
      .set("x-org-id", orgId);
    expect(current.body.data.logoStorage.bucket).toBe("org-bucket");

    const cleared = await request(ctx!.app)
      .put("/api/v1/organisations/current/logo")
      .set("x-org-id", orgId)
      .send({ logoSrc: null, logoStorage: null });
    expect(cleared.status).toBe(200);
    expect(cleared.body.data.logoSrc).toBeNull();
    expect(cleared.body.data.logoStorage).toBeNull();
  });

  it("PUT /users/:id/profile-image stores bucket for the owner only", async () => {
    const owner = await seedUser("dev-stub@example.local");
    const other = await seedUser("someone-else@example.com");

    const forbidden = await request(ctx!.app)
      .put(`/api/v1/users/${other.id}/profile-image`)
      .send({ url: "https://cdn.example/nope.png" });
    expect(forbidden.status).toBe(403);

    const updated = await request(ctx!.app)
      .put(`/api/v1/users/${owner.id}/profile-image`)
      .send({
        url: "https://cdn.example/me.png",
        fileName: "me.png",
        storageKey: "profile/me.png",
        bucket: "org-bucket",
      });
    expect(updated.status).toBe(200);
    expect(updated.body.data.profileImage).toEqual({
      url: "https://cdn.example/me.png",
      fileName: "me.png",
      storageKey: "profile/me.png",
      bucket: "org-bucket",
    });
  });
});
