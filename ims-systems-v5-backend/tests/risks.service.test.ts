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
  RiskListScopePort,
  RiskNotificationPort,
  RiskTaskPort,
} from "../src/modules/risks/ports";
import type { RiskRepository } from "../src/modules/risks/repositories/risk.repository";
import { createRiskService } from "../src/modules/risks/services/risk.service";
import { calculateScore } from "../src/modules/risks/services/scoring";
import type { Risk } from "../src/modules/risks/types";

function makeRisk(overrides: Partial<Risk> = {}): Risk {
  const now = new Date();
  const score = { likelihood: 2, consequence: 3, total: 6 };
  return {
    id: "aaaaaaaaaaaaaaaaaaaaaaaa",
    organizationId: DEV_STUB_IDENTITY.organizationId!,
    reference: "RK-TEST-0001",
    title: "Server failure",
    description: "Primary server may fail",
    type: "Hardware",
    ownerId: "bbbbbbbbbbbbbbbbbbbbbbbb",
    initialScore: score,
    currentScore: score,
    mitigated: { status: false, by: null, on: null },
    accepted: { status: false, by: null, on: null },
    escalated: { status: false, by: null, on: null },
    attachments: [],
    complianceLinks: [],
    activity: [],
    raisedBy: DEV_STUB_IDENTITY.subjectId,
    raisedOn: now,
    updatedBy: null,
    updatedOn: null,
    nextNudgeAt: null,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
    displayStatus: "Open",
    scoreBand: "low",
    ...overrides,
  };
}

describe("calculateScore", () => {
  it("multiplies likelihood by consequence", () => {
    expect(calculateScore(3, 4)).toEqual({
      likelihood: 3,
      consequence: 4,
      total: 12,
    });
  });

  it("rejects out-of-range values", () => {
    expect(() => calculateScore(0, 3)).toThrow(ValidationAppError);
    expect(() => calculateScore(3, 6)).toThrow(ValidationAppError);
    expect(() => calculateScore(2.5, 3)).toThrow(ValidationAppError);
  });
});

describe("RiskService", () => {
  let repository: RiskRepository;
  let notifications: RiskNotificationPort;
  let tasks: RiskTaskPort;
  let listScope: RiskListScopePort;
  let authorizer: Authorizer;

  beforeEach(() => {
    repository = {
      create: vi.fn(),
      findById: vi.fn(),
      list: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
      stats: vi.fn(),
      listForReport: vi.fn(),
    };
    notifications = {
      notifyOwnerAssigned: vi.fn().mockResolvedValue(undefined),
      notifyEscalated: vi.fn().mockResolvedValue(undefined),
      notifyMitigated: vi.fn().mockResolvedValue(undefined),
      notifyNudge: vi.fn().mockResolvedValue(undefined),
    };
    tasks = {
      removeTasksSourcedFromRisk: vi.fn().mockResolvedValue(undefined),
    };
    listScope = {
      resolveScope: vi.fn().mockResolvedValue({ mode: "all" }),
    };
    authorizer = {
      allow: vi.fn().mockResolvedValue(true),
    };
  });

  function service() {
    return createRiskService({
      repository,
      authorizer,
      notifications,
      tasks,
      listScope,
    });
  }

  it("creates a risk with initial and current scores and notifies owner", async () => {
    const created = makeRisk();
    vi.mocked(repository.create).mockResolvedValue(created);

    const result = await service().create(DEV_STUB_IDENTITY, {
      title: "Server failure",
      description: "Primary server may fail",
      type: "Hardware",
      ownerId: "bbbbbbbbbbbbbbbbbbbbbbbb",
      likelihood: 2,
      consequence: 3,
    });

    expect(result.reference).toBe("RK-TEST-0001");
    expect(repository.create).toHaveBeenCalledWith(
      DEV_STUB_IDENTITY.organizationId,
      expect.objectContaining({
        initialScore: { likelihood: 2, consequence: 3, total: 6 },
        currentScore: { likelihood: 2, consequence: 3, total: 6 },
        reference: expect.stringMatching(/^RK-/),
      })
    );
    expect(notifications.notifyOwnerAssigned).toHaveBeenCalled();
  });

  it("rejects create without identity", async () => {
    await expect(
      service().create(null, {
        title: "x",
        description: "y",
        type: "Hardware",
        likelihood: 1,
        consequence: 1,
      })
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("rejects create when authorizer denies", async () => {
    vi.mocked(authorizer.allow).mockResolvedValue(false);
    await expect(
      service().create(DEV_STUB_IDENTITY, {
        title: "x",
        description: "y",
        type: "Hardware",
        likelihood: 1,
        consequence: 1,
      })
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("rejects asset link for Organisational type", async () => {
    await expect(
      service().create(DEV_STUB_IDENTITY, {
        title: "Policy gap",
        description: "Missing policy",
        type: "Organisational",
        assetId: "cccccccccccccccccccccccc",
        likelihood: 2,
        consequence: 2,
      })
    ).rejects.toBeInstanceOf(ValidationAppError);
  });

  it("updates current score while preserving initial score", async () => {
    const existing = makeRisk();
    vi.mocked(repository.findById).mockResolvedValue(existing);
    vi.mocked(repository.update).mockResolvedValue(
      makeRisk({
        currentScore: { likelihood: 4, consequence: 5, total: 20 },
        scoreBand: "high",
      })
    );

    await service().update(DEV_STUB_IDENTITY, existing.id, {
      likelihood: 4,
      consequence: 5,
    });

    expect(repository.update).toHaveBeenCalledWith(
      DEV_STUB_IDENTITY.organizationId,
      existing.id,
      expect.objectContaining({
        currentScore: { likelihood: 4, consequence: 5, total: 20 },
      })
    );
  });

  it("blocks update when mitigated", async () => {
    vi.mocked(repository.findById).mockResolvedValue(
      makeRisk({
        mitigated: { status: true, by: "u", on: new Date() },
        displayStatus: "Mitigated",
      })
    );

    await expect(
      service().update(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa", {
        title: "Nope",
      })
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("mitigate records actor and notifies", async () => {
    const existing = makeRisk();
    vi.mocked(repository.findById).mockResolvedValue(existing);
    vi.mocked(repository.update).mockResolvedValue(
      makeRisk({
        mitigated: {
          status: true,
          by: DEV_STUB_IDENTITY.subjectId,
          on: new Date(),
        },
        mitigationText: "Controls applied",
        displayStatus: "Mitigated",
      })
    );

    await service().mitigate(DEV_STUB_IDENTITY, existing.id, {
      mitigationText: "Controls applied",
    });

    expect(repository.update).toHaveBeenCalledWith(
      DEV_STUB_IDENTITY.organizationId,
      existing.id,
      expect.objectContaining({
        mitigationText: "Controls applied",
        mitigated: expect.objectContaining({ status: true }),
      })
    );
    expect(notifications.notifyMitigated).toHaveBeenCalled();
  });

  it("escalate is one-way and blocked when already escalated", async () => {
    vi.mocked(repository.findById).mockResolvedValue(
      makeRisk({
        escalated: { status: true, by: "u", on: new Date() },
        displayStatus: "Escalated",
      })
    );

    await expect(
      service().escalate(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa")
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("escalate blocked when mitigated", async () => {
    vi.mocked(repository.findById).mockResolvedValue(
      makeRisk({
        mitigated: { status: true, by: "u", on: new Date() },
        displayStatus: "Mitigated",
      })
    );

    await expect(
      service().escalate(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa")
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("nudge enforces cooldown and requires owner", async () => {
    vi.mocked(repository.findById).mockResolvedValue(
      makeRisk({ ownerId: undefined })
    );
    await expect(
      service().nudge(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa")
    ).rejects.toBeInstanceOf(ValidationAppError);

    vi.mocked(repository.findById).mockResolvedValue(
      makeRisk({ nextNudgeAt: new Date(Date.now() + 60_000) })
    );
    await expect(
      service().nudge(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa")
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("soft-deletes and cascades task removal via port", async () => {
    const existing = makeRisk();
    vi.mocked(repository.findById).mockResolvedValue(existing);
    vi.mocked(repository.softDelete).mockResolvedValue(true);

    await service().remove(DEV_STUB_IDENTITY, existing.id);

    expect(repository.softDelete).toHaveBeenCalledWith(
      DEV_STUB_IDENTITY.organizationId,
      existing.id
    );
    expect(tasks.removeTasksSourcedFromRisk).toHaveBeenCalledWith({
      organizationId: DEV_STUB_IDENTITY.organizationId,
      riskId: existing.id,
    });
  });

  it("getById returns not found for deleted risks", async () => {
    vi.mocked(repository.findById).mockResolvedValue(
      makeRisk({ deletedAt: new Date() })
    );

    await expect(
      service().getById(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa")
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("scopes list and stats to authenticated organisation", async () => {
    vi.mocked(repository.list).mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 1,
    });
    vi.mocked(repository.stats).mockResolvedValue({
      total: 0,
      open: 0,
      escalated: 0,
      mitigated: 0,
      accepted: 0,
      byScoreBand: { low: 0, medium: 0, high: 0 },
    });

    await service().list(DEV_STUB_IDENTITY, { page: 1, pageSize: 20 });
    await service().stats(DEV_STUB_IDENTITY);

    expect(repository.list).toHaveBeenCalledWith(
      DEV_STUB_IDENTITY.organizationId,
      expect.any(Object),
      { mode: "all" }
    );
    expect(repository.stats).toHaveBeenCalledWith(
      DEV_STUB_IDENTITY.organizationId,
      { mode: "all" }
    );
  });

  it("blocks compliance link changes when mitigated", async () => {
    vi.mocked(repository.findById).mockResolvedValue(
      makeRisk({
        mitigated: { status: true, by: "u", on: new Date() },
        displayStatus: "Mitigated",
      })
    );

    await expect(
      service().setComplianceLinks(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa", {
        links: [{ toolkitId: "iso27001", clauseIds: ["A.5.1"] }],
      })
    ).rejects.toBeInstanceOf(ConflictError);
  });
});
