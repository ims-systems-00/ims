import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEV_STUB_IDENTITY, type Authorizer } from "../src/security";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationAppError,
} from "../src/shared";
import type {
  ComplianceToolkitPort,
  MembershipLookupPort,
  OwnershipIntegrityPort,
  SessionPort,
  UserNotificationPort,
} from "../src/modules/users/ports";
import type { UserRepository } from "../src/modules/users/repositories/user.repository";
import { createUsersService } from "../src/modules/users/services/users.service";
import { hashPassword } from "../src/modules/users/services/password";
import type { User } from "../src/modules/users/types";

function makeUser(overrides: Partial<User> = {}): User {
  const now = new Date();
  return {
    id: "aaaaaaaaaaaaaaaaaaaaaaaa",
    reference: "USR-TEST-0001",
    type: "Internal",
    firstName: "Ada",
    lastName: "Lovelace",
    name: "Ada Lovelace",
    email: "ada@example.com",
    emailVerified: { status: "pending", on: null },
    phone: "",
    phoneVerified: { status: "pending", on: null },
    systemPasswordStatus: "active",
    systemAccess: {
      status: "Active",
      period: "Full time",
      expires: null,
      updatedOn: now,
    },
    accessPolicies: [],
    profileImage: {
      url: "https://assets.imssystems.tech/images/system/avatar-placeholder.jpg",
    },
    signatureInfo: {},
    preferences: { darkMode: false, activeTheme: "blue" },
    country: { name: "United Kingdom", code: "GB" },
    locations: [],
    loggedIn: { status: null, on: null },
    createdBy: null,
    createdOn: now,
    badAttempts: 0,
    lockedUntil: null,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("UsersService", () => {
  let repository: UserRepository;
  let memberships: MembershipLookupPort;
  let sessions: SessionPort;
  let notifications: UserNotificationPort;
  let ownership: OwnershipIntegrityPort;
  let toolkits: ComplianceToolkitPort;
  let authorizer: Authorizer;

  beforeEach(() => {
    repository = {
      create: vi.fn(),
      findById: vi.fn(),
      findByIdIncludingDeleted: vi.fn(),
      findByEmail: vi.fn(),
      findPasswordHash: vi.fn(),
      listActiveByIds: vi.fn(),
      listAllActiveIds: vi.fn(),
      updateProfile: vi.fn(),
      updatePreferences: vi.fn(),
      updateSystemAccess: vi.fn(),
      updatePassword: vi.fn(),
      updateProfileImage: vi.fn(),
      updateSignature: vi.fn(),
      addLocation: vi.fn(),
      removeLocation: vi.fn(),
      softDelete: vi.fn(),
      setAccessPolicies: vi.fn(),
    };
    memberships = {
      listByOrganization: vi.fn().mockResolvedValue([
        {
          userId: "aaaaaaaaaaaaaaaaaaaaaaaa",
          role: "Basic User",
          jobTitle: "Engineer",
        },
      ]),
      findByOrganizationAndUser: vi.fn().mockResolvedValue({
        userId: "aaaaaaaaaaaaaaaaaaaaaaaa",
        role: "Basic User",
        jobTitle: "Engineer",
        salary: 50000,
      }),
    };
    sessions = { clearSessionsForUser: vi.fn().mockResolvedValue(undefined) };
    notifications = {
      sendWelcome: vi.fn().mockResolvedValue(undefined),
      sendAccessRevoked: vi.fn().mockResolvedValue(undefined),
      resendEmailVerification: vi.fn().mockResolvedValue(undefined),
    };
    ownership = {
      check: vi.fn().mockResolvedValue({
        hasOwnedData: false,
        inProgress: false,
        modules: [],
      }),
      transfer: vi.fn().mockResolvedValue(undefined),
    };
    toolkits = { assignToolkits: vi.fn().mockResolvedValue(undefined) };
    authorizer = { allow: vi.fn().mockResolvedValue(true) };
  });

  function service() {
    return createUsersService({
      repository,
      authorizer,
      memberships,
      sessions,
      notifications,
      ownership,
      toolkits,
    });
  }

  it("rejects direct create as deprecated", async () => {
    await expect(service().rejectDirectCreate()).rejects.toBeInstanceOf(
      ValidationAppError
    );
  });

  it("provisions a user when email is unique", async () => {
    const created = makeUser();
    vi.mocked(repository.findByEmail).mockResolvedValue(null);
    vi.mocked(repository.create).mockResolvedValue(created);

    const result = await service().provision(DEV_STUB_IDENTITY, {
      type: "Internal",
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      password: "Password1!",
    });

    expect(result).toEqual(created);
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "ada@example.com",
        systemPasswordStatus: "blocked",
        reference: expect.stringMatching(/^USR-/),
      })
    );
  });

  it("rejects provision without identity", async () => {
    await expect(
      service().provision(null, {
        type: "Internal",
        firstName: "A",
        lastName: "B",
        email: "a@b.com",
      })
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("rejects provision when authorizer denies", async () => {
    vi.mocked(authorizer.allow).mockResolvedValue(false);
    await expect(
      service().provision(DEV_STUB_IDENTITY, {
        type: "Internal",
        firstName: "A",
        lastName: "B",
        email: "a@b.com",
      })
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("rejects duplicate email on provision", async () => {
    vi.mocked(repository.findByEmail).mockResolvedValue(makeUser());
    await expect(
      service().provision(DEV_STUB_IDENTITY, {
        type: "Internal",
        firstName: "A",
        lastName: "B",
        email: "ada@example.com",
      })
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("lists only Active organisation members", async () => {
    const user = makeUser();
    vi.mocked(repository.listActiveByIds).mockResolvedValue({
      items: [user],
      total: 1,
    });

    const result = await service().list(DEV_STUB_IDENTITY, {
      page: 1,
      pageSize: 10,
    });

    expect(result.total).toBe(1);
    expect(result.items[0]?.user.email).toBe("ada@example.com");
    expect(result.items[0]?.membership?.jobTitle).toBe("Engineer");
    expect(repository.listActiveByIds).toHaveBeenCalledWith(
      ["aaaaaaaaaaaaaaaaaaaaaaaa"],
      expect.objectContaining({ page: 1, pageSize: 10 })
    );
  });

  it("returns classified info with membership", async () => {
    vi.mocked(repository.findById).mockResolvedValue(makeUser());
    const result = await service().getClassified(
      DEV_STUB_IDENTITY,
      "aaaaaaaaaaaaaaaaaaaaaaaa"
    );
    expect(result.membership?.salary).toBe(50000);
  });

  it("returns 404 for classified info when not in organisation", async () => {
    vi.mocked(repository.findById).mockResolvedValue(makeUser());
    vi.mocked(memberships.findByOrganizationAndUser).mockResolvedValue(null);
    await expect(
      service().getClassified(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa")
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("updates profile for self by email match", async () => {
    const self = makeUser({ email: DEV_STUB_IDENTITY.email! });
    vi.mocked(repository.findById).mockResolvedValue(self);
    vi.mocked(repository.updateProfile).mockResolvedValue({
      ...self,
      firstName: "Ada",
      lastName: "Byron",
      name: "Ada Byron",
    });

    const result = await service().updateProfile(
      DEV_STUB_IDENTITY,
      self.id,
      { lastName: "Byron" }
    );
    expect(result.name).toBe("Ada Byron");
    expect(authorizer.allow).not.toHaveBeenCalled();
  });

  it("soft-deletes by anonymising and clearing access policies", async () => {
    const user = makeUser({
      accessPolicies: [{ groupId: "g1" }],
    });
    vi.mocked(repository.findById).mockResolvedValue(user);
    vi.mocked(repository.softDelete).mockResolvedValue({
      ...user,
      systemAccess: { ...user.systemAccess, status: "Deactivated" },
      deletedAt: new Date(),
    });

    await service().softDelete(DEV_STUB_IDENTITY, user.id);

    expect(repository.softDelete).toHaveBeenCalledWith(
      user.id,
      expect.objectContaining({
        email: `(${user.id}) [${user.email}] (Deactivated)`,
        name: "Ada Lovelace (Deactivated)",
      })
    );
    expect(sessions.clearSessionsForUser).toHaveBeenCalledWith(user.id);
  });

  it("blocks self soft-delete", async () => {
    const self = makeUser({ email: DEV_STUB_IDENTITY.email! });
    vi.mocked(repository.findById).mockResolvedValue(self);
    await expect(
      service().softDelete(DEV_STUB_IDENTITY, self.id)
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("changes password and marks system password blocked", async () => {
    const self = makeUser({
      id: DEV_STUB_IDENTITY.subjectId,
      email: DEV_STUB_IDENTITY.email!,
    });
    const hash = await hashPassword("OldPass12!");
    vi.mocked(repository.findById).mockResolvedValue(self);
    vi.mocked(repository.findPasswordHash).mockResolvedValue(hash);
    vi.mocked(repository.updatePassword).mockResolvedValue(true);

    await service().changePassword(DEV_STUB_IDENTITY, self.id, {
      currentPassword: "OldPass12!",
      newPassword: "NewPass12!",
    });

    expect(repository.updatePassword).toHaveBeenCalledWith(
      self.id,
      expect.any(String),
      "blocked"
    );
  });

  it("rejects password reuse", async () => {
    const self = makeUser({
      id: DEV_STUB_IDENTITY.subjectId,
      email: DEV_STUB_IDENTITY.email!,
    });
    vi.mocked(repository.findById).mockResolvedValue(self);
    await expect(
      service().changePassword(DEV_STUB_IDENTITY, self.id, {
        currentPassword: "SamePass1!",
        newPassword: "SamePass1!",
      })
    ).rejects.toBeInstanceOf(ValidationAppError);
  });

  it("updates system access and notifies on block", async () => {
    const user = makeUser();
    vi.mocked(repository.findById).mockResolvedValue(user);
    vi.mocked(repository.updateSystemAccess).mockResolvedValue({
      ...user,
      systemAccess: { ...user.systemAccess, status: "Blocked" },
    });

    await service().updateSystemAccess(DEV_STUB_IDENTITY, user.id, {
      status: "Blocked",
    });

    expect(notifications.sendAccessRevoked).toHaveBeenCalled();
    expect(sessions.clearSessionsForUser).toHaveBeenCalledWith(user.id);
  });

  it("blocks expired users in bulk", async () => {
    const user = makeUser();
    vi.mocked(repository.findById).mockResolvedValue(user);
    vi.mocked(repository.updateSystemAccess).mockResolvedValue({
      ...user,
      systemAccess: { ...user.systemAccess, status: "Blocked" },
    });

    const result = await service().blockExpiredUsers(DEV_STUB_IDENTITY, [
      user.id,
    ]);
    expect(result.blocked).toBe(1);
  });

  it("assigns toolkits and clears sessions", async () => {
    const user = makeUser();
    vi.mocked(repository.findById).mockResolvedValue(user);

    await service().assignComplianceToolkits(DEV_STUB_IDENTITY, user.id, [
      "iso27001",
    ]);

    expect(toolkits.assignToolkits).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: user.id,
        toolkitIds: ["iso27001"],
      })
    );
    expect(sessions.clearSessionsForUser).toHaveBeenCalledWith(user.id);
  });

  it("runs ownership check via port", async () => {
    vi.mocked(repository.findById).mockResolvedValue(makeUser());
    const result = await service().checkOwnership(
      DEV_STUB_IDENTITY,
      "aaaaaaaaaaaaaaaaaaaaaaaa"
    );
    expect(result.hasOwnedData).toBe(false);
  });
});
