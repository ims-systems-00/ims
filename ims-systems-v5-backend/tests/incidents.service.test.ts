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
  IncidentCalendarPort,
  IncidentListScopePort,
  IncidentNotificationPort,
  IncidentTaskPort,
} from "../src/modules/incidents/ports";
import type { IncidentRepository } from "../src/modules/incidents/repositories/incident.repository";
import { createIncidentService } from "../src/modules/incidents/services/incident.service";
import { deriveDisplayStatus } from "../src/modules/incidents/types";
import type { Incident } from "../src/modules/incidents/types";

function makeIncident(overrides: Partial<Incident> = {}): Incident {
  const now = new Date();
  const resolved = { status: false, by: null, on: null };
  const escalated = { status: false, by: null, on: null };
  const base = {
    id: "aaaaaaaaaaaaaaaaaaaaaaaa",
    organizationId: DEV_STUB_IDENTITY.organizationId!,
    reference: "INC-TEST-0001",
    title: "Server room water leak",
    description: "Water detected under cooling unit",
    businessUnitId: "cccccccccccccccccccccccc",
    priority: "P2" as const,
    ownerId: "bbbbbbbbbbbbbbbbbbbbbbbb",
    privacy: "Business unit" as const,
    resolved,
    resolutionTimeMs: null,
    escalated,
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
    displayStatus: deriveDisplayStatus({ resolved, escalated }),
    ...overrides,
  };
  return {
    ...base,
    displayStatus: deriveDisplayStatus({
      resolved: base.resolved,
      escalated: base.escalated,
    }),
  };
}

describe("deriveDisplayStatus", () => {
  it("derives Open, Escalated, Resolved", () => {
    expect(
      deriveDisplayStatus({
        resolved: { status: false },
        escalated: { status: false },
      })
    ).toBe("Open");
    expect(
      deriveDisplayStatus({
        resolved: { status: false },
        escalated: { status: true },
      })
    ).toBe("Escalated");
    expect(
      deriveDisplayStatus({
        resolved: { status: true },
        escalated: { status: true },
      })
    ).toBe("Resolved");
  });
});

describe("IncidentService", () => {
  let repository: IncidentRepository;
  let notifications: IncidentNotificationPort;
  let calendar: IncidentCalendarPort;
  let tasks: IncidentTaskPort;
  let listScope: IncidentListScopePort;
  let authorizer: Authorizer;
  let service: ReturnType<typeof createIncidentService>;

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
      notifyOwnerAssigned: vi.fn(),
      notifyEscalated: vi.fn(),
      notifyResolved: vi.fn(),
      notifyNudge: vi.fn(),
    };
    calendar = {
      upsertPriorityEvent: vi.fn(),
      removePriorityEvent: vi.fn(),
    };
    tasks = {
      removeTasksSourcedFromIncident: vi.fn(),
    };
    listScope = {
      resolveScope: vi.fn().mockResolvedValue({ mode: "all" }),
    };
    authorizer = {
      allow: vi.fn().mockResolvedValue(true),
    };
    service = createIncidentService({
      repository,
      authorizer,
      notifications,
      calendar,
      tasks,
      listScope,
    });
  });

  it("creates an incident with defaults and notifies owner", async () => {
    const created = makeIncident({ priority: "P3" });
    vi.mocked(repository.create).mockResolvedValue(created);

    const result = await service.create(DEV_STUB_IDENTITY, {
      title: "Server room water leak",
      description: "Water detected under cooling unit",
      ownerId: "bbbbbbbbbbbbbbbbbbbbbbbb",
    });

    expect(result.reference).toBe("INC-TEST-0001");
    expect(repository.create).toHaveBeenCalledWith(
      DEV_STUB_IDENTITY.organizationId,
      expect.objectContaining({
        priority: "P3",
        privacy: "Business unit",
        raisedBy: DEV_STUB_IDENTITY.subjectId,
      })
    );
    expect(notifications.notifyOwnerAssigned).toHaveBeenCalled();
  });

  it("creates a P1 calendar event", async () => {
    vi.mocked(repository.create).mockResolvedValue(
      makeIncident({ priority: "P1" })
    );

    await service.create(DEV_STUB_IDENTITY, {
      title: "Critical outage",
      description: "Primary network down",
      priority: "P1",
    });

    expect(calendar.upsertPriorityEvent).toHaveBeenCalled();
  });

  it("rejects create without identity", async () => {
    await expect(
      service.create(null, {
        title: "X",
        description: "Y",
      })
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("rejects create when authorizer denies", async () => {
    vi.mocked(authorizer.allow).mockResolvedValue(false);
    await expect(
      service.create(DEV_STUB_IDENTITY, {
        title: "X",
        description: "Y",
      })
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("resolves via dedicated endpoint and computes resolution time", async () => {
    const raisedOn = new Date(Date.now() - 60_000);
    vi.mocked(repository.findById).mockResolvedValue(
      makeIncident({ raisedOn })
    );
    vi.mocked(repository.update).mockResolvedValue(
      makeIncident({
        raisedOn,
        resolution: "Containment complete",
        resolved: {
          status: true,
          by: DEV_STUB_IDENTITY.subjectId,
          on: new Date(),
        },
        resolutionTimeMs: 60_000,
      })
    );

    const result = await service.resolve(
      DEV_STUB_IDENTITY,
      "aaaaaaaaaaaaaaaaaaaaaaaa",
      { resolution: "Containment complete" }
    );

    expect(result.resolved.status).toBe(true);
    expect(repository.update).toHaveBeenCalledWith(
      DEV_STUB_IDENTITY.organizationId,
      "aaaaaaaaaaaaaaaaaaaaaaaa",
      expect.objectContaining({
        resolution: "Containment complete",
        resolutionTimeMs: expect.any(Number),
      })
    );
    expect(notifications.notifyResolved).toHaveBeenCalled();
  });

  it("resolves via update path with resolved flag", async () => {
    vi.mocked(repository.findById).mockResolvedValue(makeIncident());
    vi.mocked(repository.update).mockResolvedValue(
      makeIncident({
        resolved: {
          status: true,
          by: DEV_STUB_IDENTITY.subjectId,
          on: new Date(),
        },
      })
    );

    await service.update(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa", {
      resolved: true,
      resolution: "Fixed via update path",
    });

    expect(notifications.notifyResolved).toHaveBeenCalled();
  });

  it("blocks updates after resolve", async () => {
    vi.mocked(repository.findById).mockResolvedValue(
      makeIncident({
        resolved: {
          status: true,
          by: DEV_STUB_IDENTITY.subjectId,
          on: new Date(),
        },
      })
    );

    await expect(
      service.update(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa", {
        title: "Nope",
      })
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("escalates once and rejects re-escalation", async () => {
    vi.mocked(repository.findById).mockResolvedValue(makeIncident());
    vi.mocked(repository.update).mockResolvedValue(
      makeIncident({
        escalated: {
          status: true,
          by: DEV_STUB_IDENTITY.subjectId,
          on: new Date(),
        },
      })
    );

    await service.escalate(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa");
    expect(notifications.notifyEscalated).toHaveBeenCalled();

    vi.mocked(repository.findById).mockResolvedValue(
      makeIncident({
        escalated: {
          status: true,
          by: DEV_STUB_IDENTITY.subjectId,
          on: new Date(),
        },
      })
    );
    await expect(
      service.escalate(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa")
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("enforces nudge cooldown", async () => {
    vi.mocked(repository.findById).mockResolvedValue(
      makeIncident({ nextNudgeAt: new Date(Date.now() + 60_000) })
    );

    await expect(
      service.nudge(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa")
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("soft-deletes and cascades tasks; blocks delete when resolved", async () => {
    vi.mocked(repository.findById).mockResolvedValue(makeIncident());
    vi.mocked(repository.softDelete).mockResolvedValue(true);

    await service.remove(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa");
    expect(repository.softDelete).toHaveBeenCalled();
    expect(tasks.removeTasksSourcedFromIncident).toHaveBeenCalledWith({
      organizationId: DEV_STUB_IDENTITY.organizationId,
      incidentId: "aaaaaaaaaaaaaaaaaaaaaaaa",
    });

    vi.mocked(repository.findById).mockResolvedValue(
      makeIncident({
        resolved: {
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

  it("locks audit-sourced title on update", async () => {
    vi.mocked(repository.findById).mockResolvedValue(
      makeIncident({
        source: { moduleType: "audits", moduleId: "audit-1" },
      })
    );

    await expect(
      service.update(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa", {
        title: "Changed",
      })
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("blocks compliance link changes when resolved", async () => {
    vi.mocked(repository.findById).mockResolvedValue(
      makeIncident({
        resolved: {
          status: true,
          by: DEV_STUB_IDENTITY.subjectId,
          on: new Date(),
        },
      })
    );

    await expect(
      service.setComplianceLinks(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa", {
        links: [{ toolkitId: "iso27001", clauseIds: ["A.5.1"] }],
      })
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("returns not found for missing incidents", async () => {
    vi.mocked(repository.findById).mockResolvedValue(null);
    await expect(
      service.getById(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa")
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("requires resolution text when resolving", async () => {
    vi.mocked(repository.findById).mockResolvedValue(makeIncident());
    await expect(
      service.resolve(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa", {
        resolution: "   ",
      })
    ).rejects.toBeInstanceOf(ValidationAppError);
  });
});
