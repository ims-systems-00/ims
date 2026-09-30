import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEV_STUB_IDENTITY, type Authorizer } from "../src/security";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "../src/shared";
import type {
  ManagementReviewCalendarPort,
  ManagementReviewListScopePort,
  ManagementReviewNotificationPort,
  ManagementReviewTaskPort,
} from "../src/modules/management-reviews/ports";
import type { ManagementReviewRepository } from "../src/modules/management-reviews/repositories/management-review.repository";
import {
  buildScheduleDates,
  createManagementReviewService,
} from "../src/modules/management-reviews/services/management-review.service";
import { deriveDisplayStatus } from "../src/modules/management-reviews/types";
import type { ManagementReview } from "../src/modules/management-reviews/types";

function makeReview(
  overrides: Partial<ManagementReview> = {}
): ManagementReview {
  const now = new Date();
  const completed = { status: false, by: null, on: null };
  const base = {
    id: "aaaaaaaaaaaaaaaaaaaaaaaa",
    organizationId: DEV_STUB_IDENTITY.organizationId!,
    reference: "MR-TEST-0001",
    title: "Q1 leadership review",
    date: new Date(Date.now() - 86_400_000),
    time: "10:00",
    interval: "Yearly" as const,
    privacy: "Organisational" as const,
    businessUnitId: undefined,
    attendees: ["bbbbbbbbbbbbbbbbbbbbbbbb"],
    agenda: [],
    minutes: [],
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

  it("creates monthly, quarterly, and half-yearly series", () => {
    const start = new Date("2026-01-05T10:00:00.000Z");
    expect(buildScheduleDates(start, "Monthly")).toHaveLength(12);
    expect(buildScheduleDates(start, "Quarterly")).toHaveLength(4);
    expect(buildScheduleDates(start, "Half yearly")).toHaveLength(2);
  });

  it("moves Saturday and Sunday onto Monday", () => {
    const saturday = new Date(2026, 0, 3, 12, 0, 0);
    expect(saturday.getDay()).toBe(6);
    const [adjusted] = buildScheduleDates(saturday, "Yearly");
    expect(adjusted!.getDay()).toBe(1);
  });
});

describe("ManagementReviewService", () => {
  let repository: ManagementReviewRepository;
  let notifications: ManagementReviewNotificationPort;
  let calendar: ManagementReviewCalendarPort;
  let tasks: ManagementReviewTaskPort;
  let listScope: ManagementReviewListScopePort;
  let authorizer: Authorizer;
  let service: ReturnType<typeof createManagementReviewService>;

  const createInput = {
    title: "Q1 leadership review",
    date: new Date("2026-03-10T10:00:00.000Z"),
    interval: "Yearly" as const,
    time: "10:00",
    attendees: ["bbbbbbbbbbbbbbbbbbbbbbbb"],
  };

  beforeEach(() => {
    repository = {
      createMany: vi.fn(),
      findById: vi.fn(),
      list: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
      stats: vi.fn(),
    };
    notifications = { notifyScheduled: vi.fn() };
    calendar = {
      upsertReviewEvent: vi.fn(),
      removeReviewEvent: vi.fn(),
    };
    tasks = { removeTasksSourcedFromReview: vi.fn() };
    listScope = {
      resolveScope: vi.fn().mockResolvedValue({ mode: "all" }),
    };
    authorizer = { allow: vi.fn().mockResolvedValue(true) };
    service = createManagementReviewService({
      repository,
      authorizer,
      notifications,
      calendar,
      tasks,
      listScope,
    });
  });

  it("schedules a yearly review and notifies", async () => {
    const created = makeReview();
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
    expect(calendar.upsertReviewEvent).toHaveBeenCalled();
  });

  it("schedules twelve monthly reviews with attachments only on first", async () => {
    const items = Array.from({ length: 12 }, (_, i) =>
      makeReview({ id: String(i), reference: `MR-${i}` })
    );
    vi.mocked(repository.createMany).mockResolvedValue(items);

    const result = await service.create(DEV_STUB_IDENTITY, {
      ...createInput,
      interval: "Monthly",
      agenda: [{ fileName: "agenda.pdf" }],
      minutes: [{ fileName: "minutes.pdf" }],
    });

    expect(result.items).toHaveLength(12);
    const payloads = vi.mocked(repository.createMany).mock.calls[0]![1];
    expect(payloads).toHaveLength(12);
    expect(payloads[0]!.agenda).toHaveLength(1);
    expect(payloads[0]!.minutes).toHaveLength(1);
    expect(payloads[1]!.agenda).toEqual([]);
    expect(payloads[1]!.minutes).toEqual([]);
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

  it("requires business unit for Business unit privacy", async () => {
    await expect(
      service.create(DEV_STUB_IDENTITY, {
        ...createInput,
        privacy: "Business unit",
      })
    ).rejects.toThrow(/Business unit is required/);
  });

  it("rejects update of completed review", async () => {
    vi.mocked(repository.findById).mockResolvedValue(
      makeReview({
        completed: {
          status: true,
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

  it("completes a review", async () => {
    vi.mocked(repository.findById).mockResolvedValue(
      makeReview({ date: new Date(Date.now() - 86_400_000) })
    );
    vi.mocked(repository.update).mockResolvedValue(
      makeReview({
        completed: {
          status: true,
          by: DEV_STUB_IDENTITY.subjectId,
          on: new Date(),
        },
      })
    );

    const result = await service.complete(
      DEV_STUB_IDENTITY,
      "aaaaaaaaaaaaaaaaaaaaaaaa"
    );

    expect(result.completed.status).toBe(true);
  });

  it("blocks completion before schedule date", async () => {
    vi.mocked(repository.findById).mockResolvedValue(
      makeReview({ date: new Date(Date.now() + 86_400_000) })
    );

    await expect(
      service.complete(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa")
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("blocks delete of completed review", async () => {
    vi.mocked(repository.findById).mockResolvedValue(
      makeReview({
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

  it("soft-deletes scheduled review and cleans tasks/calendar", async () => {
    vi.mocked(repository.findById).mockResolvedValue(makeReview());
    vi.mocked(repository.softDelete).mockResolvedValue(true);

    await service.remove(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa");

    expect(repository.softDelete).toHaveBeenCalled();
    expect(tasks.removeTasksSourcedFromReview).toHaveBeenCalled();
    expect(calendar.removeReviewEvent).toHaveBeenCalled();
  });

  it("blocks agenda mutation when completed", async () => {
    vi.mocked(repository.findById).mockResolvedValue(
      makeReview({
        completed: {
          status: true,
          by: DEV_STUB_IDENTITY.subjectId,
          on: new Date(),
        },
      })
    );

    await expect(
      service.addAgenda(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa", [
        { fileName: "agenda.pdf" },
      ])
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("adds and removes agenda attachments", async () => {
    vi.mocked(repository.findById).mockResolvedValue(makeReview());
    vi.mocked(repository.update).mockImplementation(async (_org, _id, patch) =>
      makeReview({ agenda: patch.agenda ?? [] })
    );

    const added = await service.addAgenda(
      DEV_STUB_IDENTITY,
      "aaaaaaaaaaaaaaaaaaaaaaaa",
      [{ fileName: "agenda.pdf" }]
    );
    expect(added.agenda).toHaveLength(1);

    const attachmentId = added.agenda[0]!.id;
    vi.mocked(repository.findById).mockResolvedValue(
      makeReview({ agenda: added.agenda })
    );
    await service.removeAgenda(
      DEV_STUB_IDENTITY,
      "aaaaaaaaaaaaaaaaaaaaaaaa",
      attachmentId
    );
    expect(repository.update).toHaveBeenCalled();
  });

  it("adds and removes attendees", async () => {
    vi.mocked(repository.findById).mockResolvedValue(makeReview({ attendees: [] }));
    vi.mocked(repository.update).mockImplementation(async (_org, _id, patch) =>
      makeReview({ attendees: patch.attendees ?? [] })
    );

    const added = await service.addAttendee(
      DEV_STUB_IDENTITY,
      "aaaaaaaaaaaaaaaaaaaaaaaa",
      "cccccccccccccccccccccccc"
    );
    expect(added.attendees).toContain("cccccccccccccccccccccccc");
    expect(calendar.upsertReviewEvent).toHaveBeenCalled();

    vi.mocked(repository.findById).mockResolvedValue(
      makeReview({ attendees: ["cccccccccccccccccccccccc"] })
    );
    await service.removeAttendee(
      DEV_STUB_IDENTITY,
      "aaaaaaaaaaaaaaaaaaaaaaaa",
      "cccccccccccccccccccccccc"
    );
    expect(repository.update).toHaveBeenCalled();
  });

  it("returns not found for missing review", async () => {
    vi.mocked(repository.findById).mockResolvedValue(null);
    await expect(
      service.getById(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa")
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
