import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createTestApp, type TestContext } from "./helpers/create-test-app";
import { DEV_STUB_IDENTITY, DEV_STUB_ORGANIZATION_ID } from "../src/security";
import { createOrganisationRepository } from "../src/modules/organisation/repositories/organisation.repository";
import { getOrganisationMembershipModel } from "../src/modules/organisation/repositories/organisation-membership.model";
import { getInvitationModel } from "../src/modules/invitations/repositories/invitation.model";
import { createInvitationRepository } from "../src/modules/invitations/repositories/invitation.repository";
import { getUserModel } from "../src/modules/users/repositories/user.model";
import { createUserRepository } from "../src/modules/users/repositories/user.repository";
import { hashPassword } from "../src/modules/users/services/password";

async function seedOrganisation() {
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
      address: {
        line1: "1 Test Street",
        city: "London",
        county: "London",
        postCode: "E1 1AA",
      },
      country: { name: "United Kingdom", code: "GB", currency: "GBP", phoneCode: 44 },
    },
  });
}

async function seedUser(email: string) {
  return createUserRepository().create({
    type: "Internal",
    firstName: "Invited",
    lastName: "Person",
    email,
    reference: `USR-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
    passwordHash: await hashPassword("Password1!"),
    systemPasswordStatus: "blocked",
    systemAccessPeriod: "Full time",
    systemAccessExpires: null,
    createdBy: null,
  });
}

describe("Invitations HTTP", () => {
  let ctx: TestContext | undefined;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    if (ctx) await ctx.cleanup();
  });

  beforeEach(async () => {
    await getInvitationModel().deleteMany({});
    await getOrganisationMembershipModel().deleteMany({});
    await getUserModel().deleteMany({});
    const { getOrganisationModel } = await import(
      "../src/modules/organisation/repositories/organisation.model"
    );
    await getOrganisationModel().deleteMany({});
    await seedOrganisation();
  });

  it("POST /api/v1/invitations creates a pending invitation without leaking the token", async () => {
    const response = await request(ctx!.app)
      .post("/api/v1/invitations")
      .send({ email: "New@Example.com", role: "Basic" });

    expect(response.status).toBe(201);
    expect(response.body.data.email).toBe("new@example.com");
    expect(response.body.data.role).toBe("Basic");
    expect(response.body.data.status).toBe("Pending");
    expect(response.body.data.hasAccount).toBe(false);
    expect(response.body.data.tokenHash).toBeUndefined();
    expect(response.body.data.token).toBeUndefined();
  });

  it("rejects duplicate invitations and invalid roles", async () => {
    await request(ctx!.app)
      .post("/api/v1/invitations")
      .send({ email: "dup@example.com", role: "Basic" })
      .expect(201);

    const duplicate = await request(ctx!.app)
      .post("/api/v1/invitations")
      .send({ email: "dup@example.com", role: "Head of Service" });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.message).toMatch(/already invited/i);

    const invalid = await request(ctx!.app)
      .post("/api/v1/invitations")
      .send({ email: "x@example.com", role: "Wizard" });
    expect(invalid.status).toBe(400);
  });

  it("lists, resends and deletes invitations", async () => {
    const created = await request(ctx!.app)
      .post("/api/v1/invitations")
      .send({ email: "list@example.com", role: "Auditor" });
    const id = created.body.data.id as string;

    const list = await request(ctx!.app).get("/api/v1/invitations");
    expect(list.status).toBe(200);
    expect(list.body.data.total).toBe(1);
    expect(list.body.data.items[0].email).toBe("list@example.com");

    const resent = await request(ctx!.app).post(
      `/api/v1/invitations/${id}/resend`
    );
    expect(resent.status).toBe(200);
    expect(resent.body.data.id).toBe(id);

    const removed = await request(ctx!.app).delete(`/api/v1/invitations/${id}`);
    expect(removed.status).toBe(200);
    expect(removed.body.data.deleted).toBe(true);

    const after = await request(ctx!.app).get("/api/v1/invitations");
    expect(after.body.data.total).toBe(0);
  });

  it("previews and accepts an invitation, creating the membership exactly once", async () => {
    const user = await seedUser(DEV_STUB_IDENTITY.email!);
    const repository = createInvitationRepository();
    await repository.create({
      organizationId: DEV_STUB_ORGANIZATION_ID,
      email: DEV_STUB_IDENTITY.email!,
      role: "Head of Service",
      createdBy: "admin-1",
      inviterName: "Admin One",
      organisationName: "Test Organisation",
      rawToken: "known-test-token",
      expiresAt: new Date(Date.now() + 60_000),
    });

    const preview = await request(ctx!.app).get(
      "/api/v1/invitations/preview/known-test-token"
    );
    expect(preview.status).toBe(200);
    expect(preview.body.data.organisationName).toBe("Test Organisation");
    expect(preview.body.data.role).toBe("Head of Service");
    expect(preview.body.data.hasAccount).toBe(true);

    const accepted = await request(ctx!.app)
      .post("/api/v1/invitations/accept")
      .send({ token: "known-test-token" });
    expect(accepted.status).toBe(200);
    expect(accepted.body.data.userId).toBe(user.id);
    expect(accepted.body.data.role).toBe("Head of Service");

    const memberships = await getOrganisationMembershipModel()
      .find({ userId: user.id })
      .lean();
    expect(memberships).toHaveLength(1);
    expect(memberships[0]?.role).toBe("Head of Service");

    // Token is consumed: a second accept cannot find the invitation.
    const second = await request(ctx!.app)
      .post("/api/v1/invitations/accept")
      .send({ token: "known-test-token" });
    expect(second.status).toBe(404);
  });

  it("unknown tokens 404 on preview", async () => {
    const response = await request(ctx!.app).get(
      "/api/v1/invitations/preview/nope"
    );
    expect(response.status).toBe(404);
  });
});
