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
  AuditCalendarPort,
  AuditCipPromotionPort,
  AuditIncidentPromotionPort,
  AuditListScopePort,
  AuditNotificationPort,
  AuditReportPort,
  AuditRiskPromotionPort,
  AuditTaskPort,
} from "../src/modules/audits/ports";
import type { AuditRepository } from "../src/modules/audits/repositories/audit.repository";
import {
  buildScheduleDates,
  createAuditService,
} from "../src/modules/audits/services/audit.service";
import { deriveDisplayStatus } from "../src/modules/audits/types";
import type { Audit } from "../src/modules/audits/types";

function makeAudit(overrides: Partial<Audit> = {}): Audit {
  const now = new Date();
  const completed = { status: false, by: null, on: null };
  const base = {
    id: "aaaaaaaaaaaaaaaaaaaaaaaa",
    organizationId: DEV_STUB_IDENTITY.organizationId!,
    reference: "AUD-TEST-0001",
    title: "ISO 27001 internal review",
    type: "Internal" as const,
    focusArea: "Access control",
    businessUnitId: "cccccccccccccccccccccccc",
    complianceBodyId: "dddddddddddddddddddddddd",
    auditorId: "bbbbbbbbbbbbbbbbbbbbbbbb",
    startDate: new Date(Date.now() - 86_400_000),
    time: "09:00",
    interval: "Yearly" as const,
    comment: undefined,
    identifications: [],
    risks: [],
    ofis: [],
    attachments: [],
    complianceLinks: [],
    completed,
    createdBy: DEV_STUB_IDENTITY.subjectId,
    createdOn: now,
    updatedBy: null,
    updatedOn: null,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
    displayStatus: deriveDisplayStatus({ completed }),
    ...overrides,
  };
  return {
    ...base,
    displayStatus: deriveDisplayStatus({ completed: base.completed }),
  };
}

describe("deriveDisplayStatus", () => {
  it("derives Scheduled and Completed", () => {
    expect(deriveDisplayStatus({ completed: { status: false } })).toBe(
      "Scheduled"
    );
    expect(deriveDisplayStatus({ completed: { status: true } })).toBe(
      "Completed"
    );
  });
});

describe("buildScheduleDates", () => {
  it("creates one yearly occurrence", () => {
    const start = new Date("2026-03-10T10:00:00.000Z");
    expect(buildScheduleDates(start, "Yearly")).toHaveLength(1);
  });

  it("creates two half-yearly and four quarterly occurrences", () => {
    const start = new Date("2026-01-05T10:00:00.000Z");
    expect(buildScheduleDates(start, "Half yearly")).toHaveLength(2);
    expect(buildScheduleDates(start, "Quarterly")).toHaveLength(4);
  });

  it("moves Saturday and Sunday onto Monday", () => {
    // Local Saturday 2026-01-03
    const saturday = new Date(2026, 0, 3, 12, 0, 0);
    expect(saturday.getDay()).toBe(6);
    const [adjusted] = buildScheduleDates(saturday, "Yearly");
    expect(adjusted!.getDay()).toBe(1);
  });
});

describe("AuditService", () => {
  let repository: AuditRepository;
  let notifications: AuditNotificationPort;
  let calendar: AuditCalendarPort;
  let tasks: AuditTaskPort;
  let reports: AuditReportPort;
  let listScope: AuditListScopePort;
  let incidents: AuditIncidentPromotionPort;
  let risks: AuditRiskPromotionPort;
  let cips: AuditCipPromotionPort;
  let authorizer: Authorizer;
  let service: ReturnType<typeof createAuditService>;

  const createInput = {
    title: "ISO 27001 internal review",
    focusArea: "Access control",
    auditorId: "bbbbbbbbbbbbbbbbbbbbbbbb",
    businessUnitId: "cccccccccccccccccccccccc",
    complianceBodyId: "dddddddddddddddddddddddd",
    startDate: new Date("2026-03-10T10:00:00.000Z"),
    interval: "Yearly" as const,
    type: "Internal" as const,
    time: "09:00",
  };

  beforeEach(() => {
    repository = {
      create: vi.fn(),
      createMany: vi.fn(),
      findById: vi.fn(),
      list: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
      stats: vi.fn(),
    };
    notifications = { notifyScheduled: vi.fn() };
    calendar = {
      upsertAuditEvent: vi.fn(),
      removeAuditEvent: vi.fn(),
    };
    tasks = { removeTasksSourcedFromAudit: vi.fn() };
    reports = { enqueueExtractReport: vi.fn() };
    listScope = {
      resolveScope: vi.fn().mockResolvedValue({ mode: "all" }),
    };
    incidents = { promoteNonConformity: vi.fn().mockResolvedValue({ id: "i1" }) };
    risks = { promoteEmbeddedRisk: vi.fn().mockResolvedValue({ id: "r1" }) };
    cips = { promoteOfi: vi.fn().mockResolvedValue({ id: "c1" }) };
    authorizer = { allow: vi.fn().mockResolvedValue(true) };
    service = createAuditService({
      repository,
      authorizer,
      notifications,
      calendar,
      tasks,
      reports,
      listScope,
      incidents,
      risks,
      cips,
    });
  });

  it("schedules a yearly audit and notifies", async () => {
    const created = makeAudit();
    vi.mocked(repository.createMany).mockResolvedValue([created]);

    const result = await service.create(DEV_STUB_IDENTITY, createInput);

    expect(result.items).toHaveLength(1);
    expect(repository.createMany).toHaveBeenCalledWith(
      DEV_STUB_IDENTITY.organizationId,
      expect.arrayContaining([
        expect.objectContaining({
          title: createInput.title,
          interval: "Yearly",
          createdBy: DEV_STUB_IDENTITY.subjectId,
        }),
      ])
    );
    expect(notifications.notifyScheduled).toHaveBeenCalled();
    expect(calendar.upsertAuditEvent).toHaveBeenCalled();
  });

  it("schedules four quarterly audits", async () => {
    const items = [
      makeAudit({ id: "1", reference: "AUD-1" }),
      makeAudit({ id: "2", reference: "AUD-2" }),
      makeAudit({ id: "3", reference: "AUD-3" }),
      makeAudit({ id: "4", reference: "AUD-4" }),
    ];
    vi.mocked(repository.createMany).mockResolvedValue(items);

    const result = await service.create(DEV_STUB_IDENTITY, {
      ...createInput,
      interval: "Quarterly",
    });

    expect(result.items).toHaveLength(4);
    expect(repository.createMany).toHaveBeenCalledWith(
      DEV_STUB_IDENTITY.organizationId,
      expect.arrayContaining([
        expect.objectContaining({ attachments: expect.any(Array) }),
      ])
    );
    const payloads = vi.mocked(repository.createMany).mock.calls[0]![1];
    expect(payloads).toHaveLength(4);
    expect(payloads[0]!.attachments).toEqual([]);
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

  it("rejects update of completed audit", async () => {
    vi.mocked(repository.findById).mockResolvedValue(
      makeAudit({
        completed: {
          status: true,
          by: DEV_STUB_IDENTITY.subjectId,
          on: new Date(),
        },
      })
    );

    await expect(
      service.update(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa", {
        title: "New title long enough",
      })
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("completes an audit and promotes findings", async () => {
    const identification = {
      id: "nc1",
      nonConformity: "Missing access review",
      rootCause: "Process gap",
    };
    const risk = {
      id: "rk1",
      title: "Weak MFA",
      description: "No MFA on admin",
      likelihood: 3,
      consequence: 4,
      total: 12,
    };
    const ofi = {
      id: "ofi1",
      title: "Improve logging",
      opportunityForImprovement: "Centralise audit logs",
    };
    vi.mocked(repository.findById).mockResolvedValue(
      makeAudit({
        identifications: [identification],
        risks: [risk],
        ofis: [ofi],
        startDate: new Date(Date.now() - 86_400_000),
      })
    );
    vi.mocked(repository.update).mockResolvedValue(
      makeAudit({
        completed: {
          status: true,
          by: DEV_STUB_IDENTITY.subjectId,
          on: new Date(),
        },
        identifications: [identification],
        risks: [risk],
        ofis: [ofi],
      })
    );

    const result = await service.complete(
      DEV_STUB_IDENTITY,
      "aaaaaaaaaaaaaaaaaaaaaaaa"
    );

    expect(result.completed.status).toBe(true);
    expect(incidents.promoteNonConformity).toHaveBeenCalledWith(
      expect.objectContaining({
        identification,
        auditId: "aaaaaaaaaaaaaaaaaaaaaaaa",
      })
    );
    expect(risks.promoteEmbeddedRisk).toHaveBeenCalled();
    expect(cips.promoteOfi).toHaveBeenCalled();
  });

  it("blocks completion before schedule date", async () => {
    vi.mocked(repository.findById).mockResolvedValue(
      makeAudit({ startDate: new Date(Date.now() + 86_400_000) })
    );

    await expect(
      service.complete(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa")
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("blocks delete of completed audit", async () => {
    vi.mocked(repository.findById).mockResolvedValue(
      makeAudit({
        completed: {
          status: true,
          by: DEV_STUB_IDENTITY.subjectId,
          on: new Date(),
        },
      })
    );

    await expect(
      service.remove(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa")
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("soft-deletes scheduled audit and cleans tasks/calendar", async () => {
    vi.mocked(repository.findById).mockResolvedValue(makeAudit());
    vi.mocked(repository.softDelete).mockResolvedValue(true);

    await service.remove(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa");

    expect(repository.softDelete).toHaveBeenCalled();
    expect(tasks.removeTasksSourcedFromAudit).toHaveBeenCalled();
    expect(calendar.removeAuditEvent).toHaveBeenCalled();
  });

  it("adds and removes a non-conformity", async () => {
    vi.mocked(repository.findById).mockResolvedValue(makeAudit());
    vi.mocked(repository.update).mockImplementation(async (_org, _id, patch) =>
      makeAudit({
        identifications: patch.identifications ?? [],
      })
    );

    const added = await service.addIdentification(
      DEV_STUB_IDENTITY,
      "aaaaaaaaaaaaaaaaaaaaaaaa",
      { nonConformity: "Gap", rootCause: "Cause" }
    );
    expect(added.identifications).toHaveLength(1);

    vi.mocked(repository.findById).mockResolvedValue(
      makeAudit({
        identifications: [
          { id: "nc1", nonConformity: "Gap", rootCause: "Cause" },
        ],
      })
    );
    await service.removeIdentification(
      DEV_STUB_IDENTITY,
      "aaaaaaaaaaaaaaaaaaaaaaaa",
      "nc1"
    );
    expect(repository.update).toHaveBeenCalled();
  });

  it("rejects finding mutations when completed", async () => {
    vi.mocked(repository.findById).mockResolvedValue(
      makeAudit({
        completed: {
          status: true,
          by: DEV_STUB_IDENTITY.subjectId,
          on: new Date(),
        },
      })
    );

    await expect(
      service.addRisk(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa", {
        title: "R",
        description: "D",
        likelihood: 2,
        consequence: 3,
      })
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("validates embedded risk score bounds", async () => {
    vi.mocked(repository.findById).mockResolvedValue(makeAudit());

    await expect(
      service.addRisk(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa", {
        title: "R",
        description: "D",
        likelihood: 6,
        consequence: 3,
      })
    ).rejects.toBeInstanceOf(ValidationAppError);
  });

  it("queues extract report", async () => {
    vi.mocked(repository.findById).mockResolvedValue(makeAudit());

    const result = await service.extractReport(
      DEV_STUB_IDENTITY,
      "aaaaaaaaaaaaaaaaaaaaaaaa",
      { recipientName: "Ada", recipientEmail: "ada@example.com" }
    );

    expect(result.message).toMatch(/queued/i);
    expect(reports.enqueueExtractReport).toHaveBeenCalled();
  });

  it("returns not found for missing audit", async () => {
    vi.mocked(repository.findById).mockResolvedValue(null);
    await expect(
      service.getById(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa")
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
