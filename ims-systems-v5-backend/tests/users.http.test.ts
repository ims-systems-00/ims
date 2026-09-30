import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createTestApp, type TestContext } from "./helpers/create-test-app";
import { getUserModel } from "../src/modules/users/repositories/user.model";
import { createUserRepository } from "../src/modules/users/repositories/user.repository";
import { hashPassword } from "../src/modules/users/services/password";
import { DEV_STUB_IDENTITY } from "../src/security";

async function seedUser(input: {
  firstName?: string;
  lastName?: string;
  email: string;
  password?: string;
  status?: "Active" | "Blocked" | "Deactivated";
}) {
  const repository = createUserRepository();
  const passwordHash = await hashPassword(input.password ?? "Password1!");
  const user = await repository.create({
    type: "Internal",
    firstName: input.firstName ?? "Test",
    lastName: input.lastName ?? "User",
    email: input.email,
    reference: `USR-${Date.now().toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .slice(2, 6)
      .toUpperCase()}`,
    passwordHash,
    systemPasswordStatus: "blocked",
    systemAccessPeriod: "Full time",
    systemAccessExpires: null,
    createdBy: null,
  });

  if (input.status && input.status !== "Active") {
    await getUserModel().updateOne(
      { _id: user.id },
      {
        $set: {
          "systemAccess.status": input.status,
          ...(input.status === "Deactivated"
            ? { deletedAt: new Date() }
            : {}),
        },
      }
    );
  }

  return user;
}

describe("Users HTTP", () => {
  let ctx: TestContext | undefined;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    if (ctx) {
      await ctx.cleanup();
    }
  });

  beforeEach(async () => {
    await getUserModel().deleteMany({});
  });

  it("POST /api/v1/users is blocked as deprecated", async () => {
    const response = await request(ctx!.app).post("/api/v1/users").send({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.message).toMatch(/deprecated/i);
  });

  it("GET /api/v1/users lists Active members with pagination", async () => {
    await seedUser({ email: "one@example.com", firstName: "One" });
    await seedUser({ email: "two@example.com", firstName: "Two" });
    await seedUser({
      email: "blocked@example.com",
      firstName: "Blocked",
      status: "Blocked",
    });

    const response = await request(ctx!.app).get(
      "/api/v1/users?page=1&pageSize=10"
    );

    expect(response.status).toBe(200);
    expect(response.body.data.total).toBe(2);
    expect(response.body.data.items).toHaveLength(2);
    expect(
      response.body.data.items.every(
        (item: { user: { systemAccess: { status: string } } }) =>
          item.user.systemAccess.status === "Active"
      )
    ).toBe(true);
  });

  it("GET /api/v1/users supports search", async () => {
    await seedUser({
      email: "ada@example.com",
      firstName: "Ada",
      lastName: "Lovelace",
    });
    await seedUser({
      email: "grace@example.com",
      firstName: "Grace",
      lastName: "Hopper",
    });

    const response = await request(ctx!.app).get(
      "/api/v1/users?search=Lovelace"
    );

    expect(response.status).toBe(200);
    expect(response.body.data.total).toBe(1);
    expect(response.body.data.items[0].user.email).toBe("ada@example.com");
  });

  it("GET classified and basic info return user + membership", async () => {
    const user = await seedUser({ email: "ada@example.com" });

    const classified = await request(ctx!.app).get(
      `/api/v1/users/${user.id}/classified-info`
    );
    expect(classified.status).toBe(200);
    expect(classified.body.data.user.email).toBe("ada@example.com");
    expect(classified.body.data.membership.role).toBe("Basic User");
    expect(classified.body.data.user.passwordHash).toBeUndefined();

    const basic = await request(ctx!.app).get(
      `/api/v1/users/${user.id}/basic-info`
    );
    expect(basic.status).toBe(200);
    expect(basic.body.data.user.id).toBe(user.id);
  });

  it("GET unknown user is 404", async () => {
    const response = await request(ctx!.app).get(
      "/api/v1/users/cccccccccccccccccccccccc/classified-info"
    );
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });

  it("PATCH updates own profile by stub email", async () => {
    const user = await seedUser({
      email: DEV_STUB_IDENTITY.email!,
      firstName: "Dev",
      lastName: "Stub",
    });

    const response = await request(ctx!.app)
      .patch(`/api/v1/users/${user.id}`)
      .send({ firstName: "Developer" });

    expect(response.status).toBe(200);
    expect(response.body.data.firstName).toBe("Developer");
    expect(response.body.data.name).toBe("Developer Stub");
  });

  it("PUT preferences updates theme settings", async () => {
    const user = await seedUser({ email: DEV_STUB_IDENTITY.email! });

    const response = await request(ctx!.app)
      .put(`/api/v1/users/${user.id}/preferences`)
      .send({ darkMode: true, activeTheme: "green" });

    expect(response.status).toBe(200);
    expect(response.body.data.preferences).toEqual({
      darkMode: true,
      activeTheme: "green",
    });
  });

  it("PUT change-password validates and updates", async () => {
    const user = await seedUser({
      email: DEV_STUB_IDENTITY.email!,
      password: "OldPass12!",
    });

    const badConfirm = await request(ctx!.app)
      .put(`/api/v1/users/${user.id}/change-password`)
      .send({
        currentPassword: "OldPass12!",
        newPassword: "NewPass12!",
        confirmPassword: "Mismatch1!",
      });
    expect(badConfirm.status).toBe(400);

    const ok = await request(ctx!.app)
      .put(`/api/v1/users/${user.id}/change-password`)
      .send({
        currentPassword: "OldPass12!",
        newPassword: "NewPass12!",
        confirmPassword: "NewPass12!",
      });
    expect(ok.status).toBe(200);
  });

  it("PUT reset-password stub returns empty 200", async () => {
    const response = await request(ctx!.app).put(
      "/api/v1/users/reset-password"
    );
    expect(response.status).toBe(200);
    expect(response.text).toBe("");
  });

  it("PUT ims-access blocks a user", async () => {
    const user = await seedUser({ email: "access@example.com" });

    const response = await request(ctx!.app)
      .put(`/api/v1/users/${user.id}/ims-access`)
      .send({ status: "Blocked" });

    expect(response.status).toBe(200);
    expect(response.body.data.systemAccess.status).toBe("Blocked");

    const list = await request(ctx!.app).get("/api/v1/users");
    expect(list.body.data.total).toBe(0);
  });

  it("POST locations and DELETE location work", async () => {
    const user = await seedUser({ email: "loc@example.com" });

    const added = await request(ctx!.app)
      .post(`/api/v1/users/${user.id}/locations`)
      .send({ type: "On-site", address: "London" });

    expect(added.status).toBe(200);
    expect(added.body.data.locations).toHaveLength(1);
    const locationId = added.body.data.locations[0].id;

    const removed = await request(ctx!.app).delete(
      `/api/v1/users/${user.id}/locations/${locationId}`
    );
    expect(removed.status).toBe(200);
    expect(removed.body.data.locations).toHaveLength(0);
  });

  it("DELETE soft-deletes and anonymises the user", async () => {
    const user = await seedUser({ email: "gone@example.com" });

    const response = await request(ctx!.app).delete(
      `/api/v1/users/${user.id}`
    );
    expect(response.status).toBe(200);

    const classified = await request(ctx!.app).get(
      `/api/v1/users/${user.id}/classified-info`
    );
    expect(classified.status).toBe(404);

    const raw = await getUserModel().findById(user.id).lean();
    expect(raw?.systemAccess?.status).toBe("Deactivated");
    expect(raw?.deletedAt).toBeTruthy();
    expect(raw?.email).toContain("(Deactivated)");
    expect(raw?.accessPolicies).toEqual([]);
  });

  it("DELETE own account is forbidden", async () => {
    const self = await seedUser({ email: DEV_STUB_IDENTITY.email! });
    const response = await request(ctx!.app).delete(
      `/api/v1/users/${self.id}`
    );
    expect(response.status).toBe(403);
  });

  it("POST ownership-checks returns stub result", async () => {
    const user = await seedUser({ email: "owner@example.com" });
    const response = await request(ctx!.app).post(
      `/api/v1/users/${user.id}/ownership-checks`
    );
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      hasOwnedData: false,
      inProgress: false,
      modules: [],
    });
  });

  it("POST expired-users blocks listed members", async () => {
    const user = await seedUser({ email: "expire@example.com" });
    const response = await request(ctx!.app)
      .post("/api/v1/users/expired-users")
      .send({ userIds: [user.id] });

    expect(response.status).toBe(200);
    expect(response.body.data.blocked).toBe(1);
  });

  it("GET profile-image stub returns empty object", async () => {
    const user = await seedUser({ email: "photo@example.com" });
    const response = await request(ctx!.app).get(
      `/api/v1/users/${user.id}/profile-image`
    );
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({});
  });

  it("rejects invalid id format", async () => {
    const response = await request(ctx!.app).get(
      "/api/v1/users/not-an-id/classified-info"
    );
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });
});
