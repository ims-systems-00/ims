import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEV_STUB_IDENTITY, type Authorizer } from "../src/security";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationAppError,
} from "../src/shared";
import {
  InsufficientGroupLicenceError,
  type DashboardInitPort,
  type GroupLicencePort,
  type InvitationPort,
} from "../src/modules/functional-units/ports";
import type { FunctionalUnitRepository } from "../src/modules/functional-units/repositories/functional-unit.repository";
import { createFunctionalUnitService } from "../src/modules/functional-units/services/functional-unit.service";
import type { FunctionalUnit } from "../src/modules/functional-units/types";
import type {
  FunctionalUnitUsersPort,
  UnitMemberView,
} from "../src/modules/users";

function makeUnit(overrides: Partial<FunctionalUnit> = {}): FunctionalUnit {
  const now = new Date();
  return {
    id: "aaaaaaaaaaaaaaaaaaaaaaaa",
    organizationId: DEV_STUB_IDENTITY.organizationId!,
    reference: "FU-TEST-0001",
    name: "Operations",
    accessType: "Internal business function",
    responsibility: "Run day-to-day operations",
    operatingLocation: "London",
    totalMembers: 0,
    complianceToolkits: [],
    userLicences: {
      superUser: { allocated: 0, used: 0 },
      hosUser: { allocated: 0, used: 0 },
      basicUser: { allocated: 0, used: 0 },
      auditorUser: { allocated: 0, used: 0 },
    },
    isSystemDefault: false,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeMember(overrides: Partial<UnitMemberView> = {}): UnitMemberView {
  return {
    id: "cccccccccccccccccccccccc",
    reference: "USR-1",
    name: "Ada Lovelace",
    email: "ada@example.com",
    jobTitle: "Engineer",
    role: "Basic User",
    systemAccessStatus: "Active",
    profileImageUrl: "https://example.com/a.png",
    lastLoggedIn: null,
    ...overrides,
  };
}

describe("FunctionalUnitService", () => {
  let repository: FunctionalUnitRepository;
  let groupLicence: GroupLicencePort;
  let dashboardInit: DashboardInitPort;
  let unitUsers: FunctionalUnitUsersPort;
  let invitations: InvitationPort;
  let authorizer: Authorizer;

  beforeEach(() => {
    repository = {
      create: vi.fn(),
      findById: vi.fn(),
      list: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
      setTotalMembers: vi.fn(),
      attachPolicy: vi.fn(),
      assignComplianceToolkits: vi.fn(),
    };
    groupLicence = {
      assertCanCreateUnit: vi.fn().mockResolvedValue(undefined),
      consumeUnitLicence: vi.fn().mockResolvedValue(undefined),
    };
    dashboardInit = {
      initialiseBusinessFunctionDashboard: vi
        .fn()
        .mockResolvedValue(undefined),
    };
    unitUsers = {
      listMembers: vi.fn().mockResolvedValue([]),
      listEligible: vi.fn().mockResolvedValue([]),
      addMember: vi.fn(),
      removeMember: vi.fn(),
      countMembers: vi.fn().mockResolvedValue(0),
    };
    invitations = {
      isAvailable: vi.fn().mockResolvedValue(false),
    };
    authorizer = {
      allow: vi.fn().mockResolvedValue(true),
    };
  });

  function service() {
    return createFunctionalUnitService({
      repository,
      authorizer,
      groupLicence,
      dashboardInit,
      unitUsers,
      invitations,
    });
  }

  it("creates a business unit, consumes licence, and initialises dashboard", async () => {
    const created = makeUnit();
    vi.mocked(repository.create).mockResolvedValue(created);

    const result = await service().create(DEV_STUB_IDENTITY, {
      name: "Operations",
      accessType: "Internal business function",
      responsibility: "Run day-to-day operations",
      operatingLocation: "London",
    });

    expect(result).toEqual(created);
    expect(groupLicence.assertCanCreateUnit).toHaveBeenCalledWith(
      DEV_STUB_IDENTITY.organizationId
    );
    expect(groupLicence.consumeUnitLicence).toHaveBeenCalled();
    expect(
      dashboardInit.initialiseBusinessFunctionDashboard
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        functionalUnitId: created.id,
        organizationId: created.organizationId,
      })
    );
  });

  it("rejects create without identity", async () => {
    await expect(
      service().create(null, {
        name: "X",
        accessType: "Internal business function",
        responsibility: "Y",
        operatingLocation: "Z",
      })
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("rejects create when authorizer denies", async () => {
    vi.mocked(authorizer.allow).mockResolvedValue(false);
    await expect(
      service().create(DEV_STUB_IDENTITY, {
        name: "X",
        accessType: "Internal business function",
        responsibility: "Y",
        operatingLocation: "Z",
      })
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("rejects create when group licences are exhausted", async () => {
    vi.mocked(groupLicence.assertCanCreateUnit).mockRejectedValue(
      new InsufficientGroupLicenceError()
    );
    await expect(
      service().create(DEV_STUB_IDENTITY, {
        name: "X",
        accessType: "Internal business function",
        responsibility: "Y",
        operatingLocation: "Z",
      })
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("requires operating location for business types", async () => {
    await expect(
      service().create(DEV_STUB_IDENTITY, {
        name: "X",
        accessType: "Internal business function",
        responsibility: "Y",
      })
    ).rejects.toBeInstanceOf(ValidationAppError);
  });

  it("does not initialise dashboard for compliance units", async () => {
    const created = makeUnit({
      accessType: "Internal compliance function",
      standards: "ISO 27001",
      operatingLocation: undefined,
    });
    vi.mocked(repository.create).mockResolvedValue(created);

    await service().create(DEV_STUB_IDENTITY, {
      name: "Compliance",
      accessType: "Internal compliance function",
      responsibility: "Oversee controls",
      standards: "ISO 27001",
    });

    expect(
      dashboardInit.initialiseBusinessFunctionDashboard
    ).not.toHaveBeenCalled();
  });

  it("returns not found for missing unit", async () => {
    vi.mocked(repository.findById).mockResolvedValue(null);
    await expect(
      service().getById(DEV_STUB_IDENTITY, "bbbbbbbbbbbbbbbbbbbbbbbb")
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("blocks edit of system default units", async () => {
    vi.mocked(repository.findById).mockResolvedValue(
      makeUnit({ isSystemDefault: true, name: "iMS System administration" })
    );
    await expect(
      service().update(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa", {
        name: "Changed",
      })
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("soft-deletes non-default units", async () => {
    vi.mocked(repository.findById).mockResolvedValue(makeUnit());
    vi.mocked(repository.softDelete).mockResolvedValue(true);
    await expect(
      service().remove(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa")
    ).resolves.toBeUndefined();
    expect(repository.softDelete).toHaveBeenCalled();
  });

  it("lists members via Users port", async () => {
    const unit = makeUnit();
    const member = makeMember();
    vi.mocked(repository.findById).mockResolvedValue(unit);
    vi.mocked(unitUsers.listMembers).mockResolvedValue([member]);

    const result = await service().listMembers(DEV_STUB_IDENTITY, unit.id);
    expect(result).toEqual([member]);
    expect(unitUsers.listMembers).toHaveBeenCalledWith(
      DEV_STUB_IDENTITY.organizationId,
      unit.id
    );
  });

  it("adds a member and syncs totalMembers", async () => {
    const unit = makeUnit();
    const member = makeMember();
    vi.mocked(repository.findById).mockResolvedValue(unit);
    vi.mocked(unitUsers.addMember).mockResolvedValue(member);
    vi.mocked(unitUsers.countMembers).mockResolvedValue(1);
    vi.mocked(repository.setTotalMembers).mockResolvedValue(
      makeUnit({ totalMembers: 1 })
    );

    const result = await service().addMembers(DEV_STUB_IDENTITY, unit.id, [
      member.id,
    ]);

    expect(result.members).toEqual([member]);
    expect(result.unit.totalMembers).toBe(1);
    expect(unitUsers.addMember).toHaveBeenCalledWith(
      DEV_STUB_IDENTITY.organizationId,
      unit.id,
      member.id
    );
  });

  it("rejects duplicate membership from Users port", async () => {
    const unit = makeUnit();
    vi.mocked(repository.findById).mockResolvedValue(unit);
    vi.mocked(unitUsers.addMember).mockRejectedValue(
      new ConflictError("User already added to this group")
    );

    await expect(
      service().addMembers(DEV_STUB_IDENTITY, unit.id, [
        "cccccccccccccccccccccccc",
      ])
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("removes a member without deleting the user entity", async () => {
    const unit = makeUnit({ totalMembers: 1 });
    vi.mocked(repository.findById).mockResolvedValue(unit);
    vi.mocked(unitUsers.removeMember).mockResolvedValue(true);
    vi.mocked(unitUsers.countMembers).mockResolvedValue(0);
    vi.mocked(repository.setTotalMembers).mockResolvedValue(
      makeUnit({ totalMembers: 0 })
    );

    const result = await service().removeMember(
      DEV_STUB_IDENTITY,
      unit.id,
      "cccccccccccccccccccccccc"
    );

    expect(result.unit.totalMembers).toBe(0);
    expect(unitUsers.removeMember).toHaveBeenCalled();
  });

  it("blocks member management on system default units", async () => {
    vi.mocked(repository.findById).mockResolvedValue(
      makeUnit({ isSystemDefault: true })
    );
    await expect(
      service().addMembers(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa", [
        "cccccccccccccccccccccccc",
      ])
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("checks invitation availability when listing eligible members", async () => {
    vi.mocked(repository.findById).mockResolvedValue(makeUnit());
    await service().listEligibleMembers(
      DEV_STUB_IDENTITY,
      "aaaaaaaaaaaaaaaaaaaaaaaa"
    );
    expect(invitations.isAvailable).toHaveBeenCalled();
  });
});
