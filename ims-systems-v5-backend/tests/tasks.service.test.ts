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
  TaskCalendarPort,
  TaskNotificationPort,
  TaskUnitMembersPort,
} from "../src/modules/tasks/ports";
import type { TaskRepository } from "../src/modules/tasks/repositories/task.repository";
import { createTaskService } from "../src/modules/tasks/services/task.service";
import type { Task } from "../src/modules/tasks/types";

function makeTask(overrides: Partial<Task> = {}): Task {
  const now = new Date();
  return {
    id: "aaaaaaaaaaaaaaaaaaaaaaaa",
    organizationId: DEV_STUB_IDENTITY.organizationId!,
    reference: "TSK-TEST-0001",
    name: "Patch servers",
    description: "Apply security patches",
    dueDate: now,
    priority: "Medium",
    teamPriority: false,
    assignees: [
      { userId: DEV_STUB_IDENTITY.subjectId, acceptance: "Pending" },
    ],
    status: "Pending",
    completedBy: null,
    completedOn: null,
    attachments: [],
    activity: [],
    createdBy: DEV_STUB_IDENTITY.subjectId,
    createdOn: now,
    updatedBy: null,
    updatedOn: null,
    nextNudgeAt: null,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("TaskService", () => {
  let repository: TaskRepository;
  let notifications: TaskNotificationPort;
  let calendar: TaskCalendarPort;
  let unitMembers: TaskUnitMembersPort;
  let authorizer: Authorizer;
  let service: ReturnType<typeof createTaskService>;

  beforeEach(() => {
    repository = {
      create: vi.fn(),
      findById: vi.fn(),
      listForSubject: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
      softDeleteBySource: vi.fn(),
      listTopIncomplete: vi.fn(),
    };
    notifications = {
      notifyAssigneesAssigned: vi.fn(),
      notifyCreatorAccepted: vi.fn(),
      notifyCreatorDeclined: vi.fn(),
      notifyCreatorCompleted: vi.fn(),
      notifyNudge: vi.fn(),
    };
    calendar = {
      upsertDueDateEvent: vi.fn(),
      removeDueDateEvent: vi.fn(),
    };
    unitMembers = {
      listMemberIds: vi.fn().mockResolvedValue(["user-a", "user-b"]),
    };
    authorizer = {
      allow: vi.fn().mockResolvedValue(true),
    };
    service = createTaskService({
      repository,
      authorizer,
      notifications,
      calendar,
      unitMembers,
    });
  });

  it("creates an individual task and notifies assignees", async () => {
    const created = makeTask();
    vi.mocked(repository.create).mockResolvedValue(created);

    const result = await service.create(DEV_STUB_IDENTITY, {
      name: "Patch servers",
      teamPriority: false,
      assigneeIds: [DEV_STUB_IDENTITY.subjectId],
      priority: "High",
    });

    expect(result.reference).toBe("TSK-TEST-0001");
    expect(repository.create).toHaveBeenCalledWith(
      DEV_STUB_IDENTITY.organizationId,
      expect.objectContaining({
        name: "Patch servers",
        priority: "High",
        status: "Pending",
        createdBy: DEV_STUB_IDENTITY.subjectId,
        assignees: [
          { userId: DEV_STUB_IDENTITY.subjectId, acceptance: "Pending" },
        ],
      })
    );
    expect(notifications.notifyAssigneesAssigned).toHaveBeenCalled();
    expect(calendar.upsertDueDateEvent).toHaveBeenCalled();
  });

  it("creates a team task from unit membership", async () => {
    const created = makeTask({
      teamPriority: true,
      businessUnitId: "cccccccccccccccccccccccc",
      assignees: [
        { userId: "user-a", acceptance: "Pending" },
        { userId: "user-b", acceptance: "Pending" },
      ],
    });
    vi.mocked(repository.create).mockResolvedValue(created);

    await service.create(DEV_STUB_IDENTITY, {
      name: "Team review",
      teamPriority: true,
      businessUnitId: "cccccccccccccccccccccccc",
    });

    expect(unitMembers.listMemberIds).toHaveBeenCalledWith(
      DEV_STUB_IDENTITY.organizationId,
      "cccccccccccccccccccccccc"
    );
    expect(repository.create).toHaveBeenCalledWith(
      DEV_STUB_IDENTITY.organizationId,
      expect.objectContaining({
        teamPriority: true,
        assignees: [
          { userId: "user-a", acceptance: "Pending" },
          { userId: "user-b", acceptance: "Pending" },
        ],
      })
    );
  });

  it("rejects create without identity", async () => {
    await expect(
      service.create(null, { name: "X", teamPriority: false })
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("rejects create when authorizer denies", async () => {
    vi.mocked(authorizer.allow).mockResolvedValue(false);
    await expect(
      service.create(DEV_STUB_IDENTITY, {
        name: "X",
        teamPriority: false,
      })
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("rejects team create without business unit", async () => {
    await expect(
      service.create(DEV_STUB_IDENTITY, {
        name: "Team",
        teamPriority: true,
      })
    ).rejects.toBeInstanceOf(ValidationAppError);
  });

  it("hides tasks the subject did not create and is not assigned to", async () => {
    vi.mocked(repository.findById).mockResolvedValue(
      makeTask({
        createdBy: "someone-else",
        assignees: [{ userId: "other", acceptance: "Pending" }],
      })
    );

    await expect(
      service.getById(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa")
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("accept moves Pending → In progress on first accept", async () => {
    const existing = makeTask();
    vi.mocked(repository.findById).mockResolvedValue(existing);
    vi.mocked(repository.update).mockResolvedValue(
      makeTask({
        status: "In progress",
        assignees: [
          { userId: DEV_STUB_IDENTITY.subjectId, acceptance: "Accepted" },
        ],
      })
    );

    const result = await service.accept(
      DEV_STUB_IDENTITY,
      "aaaaaaaaaaaaaaaaaaaaaaaa"
    );

    expect(result.status).toBe("In progress");
    expect(repository.update).toHaveBeenCalledWith(
      DEV_STUB_IDENTITY.organizationId,
      "aaaaaaaaaaaaaaaaaaaaaaaa",
      expect.objectContaining({
        status: "In progress",
        assignees: [
          { userId: DEV_STUB_IDENTITY.subjectId, acceptance: "Accepted" },
        ],
      })
    );
    expect(notifications.notifyCreatorAccepted).toHaveBeenCalled();
  });

  it("accept is bound to session identity, not request body", async () => {
    vi.mocked(repository.findById).mockResolvedValue(
      makeTask({
        assignees: [{ userId: "other-assignee", acceptance: "Pending" }],
        createdBy: DEV_STUB_IDENTITY.subjectId,
      })
    );

    await expect(
      service.accept(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa")
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("decline records Declined without completing the task", async () => {
    vi.mocked(repository.findById).mockResolvedValue(makeTask());
    vi.mocked(repository.update).mockResolvedValue(
      makeTask({
        assignees: [
          { userId: DEV_STUB_IDENTITY.subjectId, acceptance: "Declined" },
        ],
      })
    );

    const result = await service.decline(
      DEV_STUB_IDENTITY,
      "aaaaaaaaaaaaaaaaaaaaaaaa"
    );
    expect(result.assignees[0]?.acceptance).toBe("Declined");
    expect(notifications.notifyCreatorDeclined).toHaveBeenCalled();
  });

  it("complete locks further updates", async () => {
    vi.mocked(repository.findById).mockResolvedValue(makeTask());
    vi.mocked(repository.update).mockResolvedValue(
      makeTask({ status: "Complete", completedBy: DEV_STUB_IDENTITY.subjectId })
    );

    await service.complete(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa");

    vi.mocked(repository.findById).mockResolvedValue(
      makeTask({ status: "Complete" })
    );
    await expect(
      service.update(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa", {
        name: "Nope",
      })
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("blocks non-creators from changing assignment fields", async () => {
    vi.mocked(repository.findById).mockResolvedValue(
      makeTask({
        createdBy: "creator-user",
        assignees: [
          { userId: DEV_STUB_IDENTITY.subjectId, acceptance: "Accepted" },
        ],
      })
    );

    await expect(
      service.update(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa", {
        priority: "High",
      })
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("only creator can soft-delete", async () => {
    vi.mocked(repository.findById).mockResolvedValue(
      makeTask({
        createdBy: "creator-user",
        assignees: [
          { userId: DEV_STUB_IDENTITY.subjectId, acceptance: "Pending" },
        ],
      })
    );

    await expect(
      service.remove(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa")
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("soft-deletes when creator removes", async () => {
    vi.mocked(repository.findById).mockResolvedValue(makeTask());
    vi.mocked(repository.softDelete).mockResolvedValue(true);

    await service.remove(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa");

    expect(repository.softDelete).toHaveBeenCalledWith(
      DEV_STUB_IDENTITY.organizationId,
      "aaaaaaaaaaaaaaaaaaaaaaaa"
    );
    expect(calendar.removeDueDateEvent).toHaveBeenCalled();
  });

  it("enforces nudge cooldown", async () => {
    vi.mocked(repository.findById).mockResolvedValue(
      makeTask({ nextNudgeAt: new Date(Date.now() + 60_000) })
    );

    await expect(
      service.nudge(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa")
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("cascades soft-delete by source without client org id", async () => {
    vi.mocked(repository.softDeleteBySource).mockResolvedValue(2);

    const count = await service.removeTasksSourcedFrom(
      DEV_STUB_IDENTITY.organizationId!,
      { moduleType: "risks", moduleId: "risk-1" }
    );

    expect(count).toBe(2);
    expect(repository.softDeleteBySource).toHaveBeenCalledWith(
      DEV_STUB_IDENTITY.organizationId,
      { moduleType: "risks", moduleId: "risk-1" }
    );
  });

  it("returns not found for soft-deleted tasks", async () => {
    vi.mocked(repository.findById).mockResolvedValue(
      makeTask({ deletedAt: new Date() })
    );

    await expect(
      service.getById(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa")
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
