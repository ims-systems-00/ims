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
  OfiListScopePort,
  OfiNotificationPort,
  OfiTaskPort,
} from "../src/modules/ofi/ports";
import type { OfiRepository } from "../src/modules/ofi/repositories/ofi.repository";
import { createOfiService } from "../src/modules/ofi/services/ofi.service";
import { deriveDisplayStatus } from "../src/modules/ofi/types";
import type { Ofi } from "../src/modules/ofi/types";

function makeOfi(overrides: Partial<Ofi> = {}): Ofi {
  const now = new Date();
  const implemented = {
    status: "Pending" as const,
    by: null,
    on: null,
  };
  const base = {
    id: "aaaaaaaaaaaaaaaaaaaaaaaa",
    organizationId: DEV_STUB_IDENTITY.organizationId!,
    reference: "OFI-TEST-0001",
    title: "Improve access review evidence packing",
    opportunityForImprovement:
      "Centralise quarterly review packs in a controlled folder",
    ownerId: "bbbbbbbbbbbbbbbbbbbbbbbb",
    businessUnitId: "cccccccccccccccccccccccc",
    cost: 500,
    implemented,
    attachments: [],
    complianceLinks: [],
    activity: [],
    createdBy: DEV_STUB_IDENTITY.subjectId,
    createdOn: now,
    updatedBy: null,
    updatedOn: null,
    nextNudgeAt: null,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
    displayStatus: deriveDisplayStatus({ implemented }),
    ...overrides,
  };
  return {
    ...base,
    displayStatus: deriveDisplayStatus({ implemented: base.implemented }),
  };
}

describe("deriveDisplayStatus", () => {
  it("mirrors implementation status", () => {
    expect(
      deriveDisplayStatus({ implemented: { status: "Pending" } })
    ).toBe("Pending");
    expect(
      deriveDisplayStatus({ implemented: { status: "In Progress" } })
    ).toBe("In Progress");
    expect(
      deriveDisplayStatus({ implemented: { status: "Implemented" } })
    ).toBe("Implemented");
  });
});

describe("OfiService", () => {
  let repository: OfiRepository;
  let notifications: OfiNotificationPort;
  let tasks: OfiTaskPort;
  let listScope: OfiListScopePort;
  let authorizer: Authorizer;
  let service: ReturnType<typeof createOfiService>;

  const createInput = {
    title: "Improve access review evidence packing",
    opportunityForImprovement:
      "Centralise quarterly review packs in a controlled folder",
    ownerId: "bbbbbbbbbbbbbbbbbbbbbbbb",
    businessUnitId: "cccccccccccccccccccccccc",
    cost: 500,
  };

  beforeEach(() => {
    repository = {
      create: vi.fn(),
      findById: vi.fn(),
      list: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
      stats: vi.fn(),
    };
    notifications = {
      notifyOwnerAssigned: vi.fn(),
      notifyImplemented: vi.fn(),
      notifyNudge: vi.fn(),
    };
    tasks = { removeTasksSourcedFromOfi: vi.fn() };
    listScope = {
      resolveScope: vi.fn().mockResolvedValue({ mode: "all" }),
    };
    authorizer = { allow: vi.fn().mockResolvedValue(true) };
    service = createOfiService({
      repository,
      authorizer,
      notifications,
      tasks,
      listScope,
    });
  });

  it("creates an OFI and notifies the owner", async () => {
    const created = makeOfi();
    vi.mocked(repository.create).mockResolvedValue(created);

    const result = await service.create(DEV_STUB_IDENTITY, createInput);

    expect(result.reference).toMatch(/^OFI-/);
    expect(repository.create).toHaveBeenCalledWith(
      DEV_STUB_IDENTITY.organizationId,
      expect.objectContaining({
        title: createInput.title,
        ownerId: createInput.ownerId,
        businessUnitId: createInput.businessUnitId,
      })
    );
    expect(notifications.notifyOwnerAssigned).toHaveBeenCalled();
  });

  it("rejects create without identity", async () => {
    await expect(service.create(null, createInput)).rejects.toBeInstanceOf(
      UnauthorizedError
    );
  });

  it("rejects create when authorizer denies", async () => {
    vi.mocked(authorizer.allow).mockResolvedValue(false);
    await expect(
      service.create(DEV_STUB_IDENTITY, createInput)
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("promotes an audit OFI without owner", async () => {
    const promoted = makeOfi({
      ownerId: undefined,
      source: { moduleType: "audits", moduleId: "dddddddddddddddddddddddd" },
    });
    vi.mocked(repository.create).mockResolvedValue(promoted);

    const result = await service.createFromAuditPromotion(DEV_STUB_IDENTITY, {
      id: "eeeeeeeeeeeeeeeeeeeeeeee",
      title: "Improve logging",
      opportunityForImprovement: "Centralise audit logs",
      businessUnitId: "cccccccccccccccccccccccc",
      createdBy: "bbbbbbbbbbbbbbbbbbbbbbbb",
      auditId: "dddddddddddddddddddddddd",
    });

    expect(result.source?.moduleType).toBe("audits");
    expect(repository.create).toHaveBeenCalledWith(
      DEV_STUB_IDENTITY.organizationId,
      expect.objectContaining({
        id: "eeeeeeeeeeeeeeeeeeeeeeee",
        source: {
          moduleType: "audits",
          moduleId: "dddddddddddddddddddddddd",
        },
      })
    );
  });

  it("rejects update of implemented OFI", async () => {
    vi.mocked(repository.findById).mockResolvedValue(
      makeOfi({
        implemented: {
          status: "Implemented",
          by: DEV_STUB_IDENTITY.subjectId,
          on: new Date(),
        },
      })
    );

    await expect(
      service.update(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa", {
        title: "New title",
      })
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("locks title/description on audit-sourced OFIs", async () => {
    vi.mocked(repository.findById).mockResolvedValue(
      makeOfi({
        source: { moduleType: "audits", moduleId: "dddddddddddddddddddddddd" },
      })
    );

    await expect(
      service.update(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa", {
        title: "Changed",
      })
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("moves Pending to In Progress on first activity", async () => {
    vi.mocked(repository.findById).mockResolvedValue(makeOfi());
    vi.mocked(repository.update).mockResolvedValue(
      makeOfi({
        implemented: { status: "In Progress", by: null, on: null },
      })
    );

    const result = await service.addActivity(
      DEV_STUB_IDENTITY,
      "aaaaaaaaaaaaaaaaaaaaaaaa",
      { message: "Started gathering evidence" }
    );

    expect(result.implemented.status).toBe("In Progress");
    expect(repository.update).toHaveBeenCalledWith(
      DEV_STUB_IDENTITY.organizationId,
      "aaaaaaaaaaaaaaaaaaaaaaaa",
      expect.objectContaining({
        implemented: { status: "In Progress", by: null, on: null },
      })
    );
  });

  it("implements an OFI", async () => {
    vi.mocked(repository.findById).mockResolvedValue(makeOfi());
    vi.mocked(repository.update).mockResolvedValue(
      makeOfi({
        implemented: {
          status: "Implemented",
          by: DEV_STUB_IDENTITY.subjectId,
          on: new Date(),
        },
      })
    );

    const result = await service.implement(
      DEV_STUB_IDENTITY,
      "aaaaaaaaaaaaaaaaaaaaaaaa"
    );

    expect(result.implemented.status).toBe("Implemented");
    expect(notifications.notifyImplemented).toHaveBeenCalled();
  });

  it("blocks implement when already implemented", async () => {
    vi.mocked(repository.findById).mockResolvedValue(
      makeOfi({
        implemented: {
          status: "Implemented",
          by: DEV_STUB_IDENTITY.subjectId,
          on: new Date(),
        },
      })
    );

    await expect(
      service.implement(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa")
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("nudges owner with cooldown", async () => {
    vi.mocked(repository.findById).mockResolvedValue(makeOfi());
    vi.mocked(repository.update).mockResolvedValue(
      makeOfi({ nextNudgeAt: new Date(Date.now() + 60_000) })
    );

    await service.nudge(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa");
    expect(notifications.notifyNudge).toHaveBeenCalled();

    vi.mocked(repository.findById).mockResolvedValue(
      makeOfi({ nextNudgeAt: new Date(Date.now() + 60_000) })
    );
    await expect(
      service.nudge(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa")
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("rejects nudge without owner", async () => {
    vi.mocked(repository.findById).mockResolvedValue(
      makeOfi({ ownerId: undefined })
    );
    await expect(
      service.nudge(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa")
    ).rejects.toBeInstanceOf(ValidationAppError);
  });

  it("blocks delete of implemented OFI", async () => {
    vi.mocked(repository.findById).mockResolvedValue(
      makeOfi({
        implemented: {
          status: "Implemented",
          by: DEV_STUB_IDENTITY.subjectId,
          on: new Date(),
        },
      })
    );

    await expect(
      service.remove(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa")
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("soft-deletes pending OFI and cleans tasks", async () => {
    vi.mocked(repository.findById).mockResolvedValue(makeOfi());
    vi.mocked(repository.softDelete).mockResolvedValue(true);

    await service.remove(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa");

    expect(repository.softDelete).toHaveBeenCalled();
    expect(tasks.removeTasksSourcedFromOfi).toHaveBeenCalled();
  });

  it("returns not found for missing OFI", async () => {
    vi.mocked(repository.findById).mockResolvedValue(null);
    await expect(
      service.getById(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa")
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
