import { describe, expect, it, vi } from "vitest";
import { createInvitationService } from "../src/modules/invitations/services/invitation.service";
import type { InvitationRepository } from "../src/modules/invitations/repositories/invitation.repository";
import type { Invitation } from "../src/modules/invitations/types";
import type { SecurityIdentity } from "../src/security";

const ORG_ID = "000000000000000000000001";

const admin: SecurityIdentity = {
  subjectId: "admin-1",
  organizationId: ORG_ID,
  email: "admin@acme.example",
};

const stored: Invitation = {
  id: "inv-1",
  organizationId: ORG_ID,
  email: "new@acme.example",
  role: "Basic",
  createdBy: "admin-1",
  inviterName: "Admin One",
  organisationName: "Acme Ltd",
  expiresAt: new Date(Date.now() + 60_000),
  createdAt: new Date(),
  updatedAt: new Date(),
};

function fakeRepository(existing: Invitation | null = null) {
  const repository = {
    create: vi.fn(async () => ({ ...stored })),
    findById: vi.fn(async () => (existing ? { ...existing } : null)),
    findByOrgAndEmail: vi.fn(async () => (existing ? { ...existing } : null)),
    findByRawToken: vi.fn(async () => (existing ? { ...existing } : null)),
    listByOrganization: vi.fn(async () => ({
      items: existing ? [{ ...existing }] : [],
      total: existing ? 1 : 0,
    })),
    listAllByOrganization: vi.fn(async () =>
      existing ? [{ ...existing }] : []
    ),
    listByEmail: vi.fn(async () => (existing ? [{ ...existing }] : [])),
    countByOrganization: vi.fn(async () => (existing ? 1 : 0)),
    rotateToken: vi.fn(async () => ({ ...stored })),
    remove: vi.fn(async () => true),
  };
  return repository as unknown as InvitationRepository & typeof repository;
}

function makeService(overrides: {
  repository?: ReturnType<typeof fakeRepository>;
  members?: Array<{ userId: string; role: string }>;
  existingUser?: { id: string; email: string; name: string } | null;
  allocatedUsers?: number;
  allocatedSuper?: number;
} = {}) {
  const repository = overrides.repository ?? fakeRepository();
  const sent: Array<{ to: string; acceptUrl: string; role: string }> = [];
  const membershipsCreated: Array<Record<string, unknown>> = [];
  const projected: Array<Record<string, unknown>> = [];

  const service = createInvitationService({
    repository,
    authorizer: { allow: vi.fn(async () => true) },
    organisations: {
      findById: vi.fn(async () => ({
        id: ORG_ID,
        name: "Acme Ltd",
        licences: {
          superUser: {
            allocated: overrides.allocatedSuper ?? 0,
            used: 0,
          },
          users: { allocated: overrides.allocatedUsers ?? 0, used: 0 },
          groups: { allocated: 0, used: 0 },
          complianceTools: [],
          additionalModules: [],
          carbocalc: false,
          imsforms: false,
          projectims: false,
        },
      })),
    },
    memberships: {
      findByUserAndOrg: vi.fn(
        async (userId: string) =>
          (overrides.members ?? []).find((m) => m.userId === userId) ?? null
      ),
      listByOrganization: vi.fn(async () => overrides.members ?? []),
      create: vi.fn(async (input: Record<string, unknown>) => {
        membershipsCreated.push(input);
        return { userId: input.userId, role: input.role };
      }),
    } as never,
    users: {
      findByEmail: vi.fn(async () => overrides.existingUser ?? null),
      findById: vi.fn(async (id: string) =>
        id === "admin-1"
          ? { id, email: "admin@acme.example", name: "Admin One" }
          : (overrides.existingUser ?? null)
      ),
    },
    email: {
      sendInvitation: vi.fn(async (input: (typeof sent)[number]) => {
        sent.push(input);
      }),
    },
    membershipProjection: {
      onMembershipCreated: vi.fn(async (input: Record<string, unknown>) => {
        projected.push(input);
      }),
      onMembershipRoleChanged: vi.fn(async () => undefined),
      onMembershipRemoved: vi.fn(async () => undefined),
    },
    clientUrl: "http://localhost:3000",
  });

  return { service, repository, sent, membershipsCreated, projected };
}

describe("createInvitationService", () => {
  it("creates an invitation and emails an acceptance link containing the raw token", async () => {
    const { service, repository, sent } = makeService();

    const result = await service.create(admin, {
      email: "New@Acme.example",
      role: "Basic",
    });

    expect(result.email).toBe("new@acme.example");
    expect(result.status).toBe("Pending");
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: "new@acme.example", role: "Basic" })
    );
    expect(sent).toHaveLength(1);
    expect(sent[0]?.to).toBe("new@acme.example");
    expect(sent[0]?.acceptUrl).toMatch(
      /^http:\/\/localhost:3000\/auth\/onboard\/accept-invitation\/[a-f0-9]{64}\?hasAccount=false$/
    );
    // The raw token must never be part of the API result.
    expect(JSON.stringify(result)).not.toContain(
      sent[0]!.acceptUrl.split("/").pop()!.split("?")[0]
    );
  });

  it("blocks duplicate pending invitations and existing members", async () => {
    const duplicate = makeService({
      repository: fakeRepository(stored),
    });
    await expect(
      duplicate.service.create(admin, { email: stored.email, role: "Basic" })
    ).rejects.toThrow("already invited");

    const member = makeService({
      existingUser: { id: "user-9", email: stored.email, name: "Existing" },
      members: [{ userId: "user-9", role: "Basic" }],
    });
    await expect(
      member.service.create(admin, { email: stored.email, role: "Basic" })
    ).rejects.toThrow("already is a member");
  });

  it("blocks invites when the configured licence seats are taken", async () => {
    const { service } = makeService({
      allocatedUsers: 1,
      members: [{ userId: "user-1", role: "Basic" }],
    });
    await expect(
      service.create(admin, { email: "other@acme.example", role: "Basic" })
    ).rejects.toThrow("No available licences");
  });

  it("resend rotates the token and extends the expiry", async () => {
    const { service, repository, sent } = makeService({
      repository: fakeRepository(stored),
    });
    const result = await service.resend(admin, stored.id);
    expect(result.id).toBe(stored.id);
    expect(repository.rotateToken).toHaveBeenCalledWith(
      stored.id,
      expect.stringMatching(/^[a-f0-9]{64}$/),
      expect.any(Date)
    );
    expect(sent).toHaveLength(1);
  });

  it("preview rejects expired tokens", async () => {
    const expired = { ...stored, expiresAt: new Date(Date.now() - 1_000) };
    const { service } = makeService({
      repository: fakeRepository(expired),
    });
    await expect(service.preview("some-token")).rejects.toThrow(
      "Token expired."
    );
  });

  it("accept creates the membership, projects it, and consumes the invitation", async () => {
    const { service, repository, membershipsCreated, projected } =
      makeService({
        repository: fakeRepository(stored),
        existingUser: { id: "user-9", email: stored.email, name: "New User" },
      });

    const result = await service.accept(
      { subjectId: "user-9", email: stored.email },
      "raw-token"
    );

    expect(result).toEqual({
      organizationId: ORG_ID,
      organisationName: "Acme Ltd",
      role: "Basic",
      userId: "user-9",
    });
    expect(membershipsCreated).toEqual([
      { organizationId: ORG_ID, userId: "user-9", role: "Basic" },
    ]);
    expect(projected).toHaveLength(1);
    expect(repository.remove).toHaveBeenCalledWith(stored.id);
  });

  it("accept requires the signed-in email to match and an existing account", async () => {
    const mismatch = makeService({
      repository: fakeRepository(stored),
      existingUser: { id: "user-9", email: stored.email, name: "New User" },
    });
    await expect(
      mismatch.service.accept(
        { subjectId: "user-1", email: "someone-else@acme.example" },
        "raw-token"
      )
    ).rejects.toThrow("does not match");
    expect(mismatch.membershipsCreated).toHaveLength(0);

    const noAccount = makeService({
      repository: fakeRepository(stored),
      existingUser: null,
    });
    await expect(
      noAccount.service.accept(
        { subjectId: "user-9", email: stored.email },
        "raw-token"
      )
    ).rejects.toThrow("No user account exists");
  });

  it("listReceived only returns unexpired invitations for the caller email", async () => {
    const { service } = makeService({
      repository: fakeRepository(stored),
    });
    const received = await service.listReceived({
      subjectId: "user-9",
      email: stored.email,
    });
    expect(received).toHaveLength(1);
    expect(received[0]?.status).toBe("Pending");
  });
});
