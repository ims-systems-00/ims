import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEV_STUB_IDENTITY, type Authorizer } from "../src/security";
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationAppError,
} from "../src/shared";
import type { NotificationsUsersPort } from "../src/modules/notifications/ports";
import type { NotificationRepository } from "../src/modules/notifications/repositories/notification.repository";
import { createNotificationsService } from "../src/modules/notifications/services/notifications.service";
import type { Notification } from "../src/modules/notifications/types";

function makeNotification(
  overrides: Partial<Notification> = {}
): Notification {
  const now = new Date();
  return {
    id: "aaaaaaaaaaaaaaaaaaaaaaaa",
    organizationId: DEV_STUB_IDENTITY.organizationId!,
    recipientUserId: DEV_STUB_IDENTITY.subjectId,
    title: "Risk management",
    message: "You were assigned a risk",
    referenceType: "risks",
    referenceModuleId: "bbbbbbbbbbbbbbbbbbbbbbbb",
    screenIdentifier: "risk-detail",
    params: { id: "bbbbbbbbbbbbbbbbbbbbbbbb", businessUnitId: null },
    sent: { status: "unsent", on: null },
    read: { status: "unread", on: null },
    popUp: { status: "read", on: null },
    isOrganizational: false,
    createdBy: "cccccccccccccccystem",
    createdOn: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("NotificationsService", () => {
  let repository: NotificationRepository;
  let users: NotificationsUsersPort;
  let authorizer: Authorizer;
  let service: ReturnType<typeof createNotificationsService>;

  beforeEach(() => {
    authorizer = { allow: vi.fn().mockResolvedValue(true) };
    users = { listActiveUserIds: vi.fn().mockResolvedValue([]) };
    repository = {
      insertMany: vi.fn().mockResolvedValue([]),
      findById: vi.fn(),
      list: vi.fn(),
      countUnsent: vi.fn().mockResolvedValue(0),
      markAllSent: vi.fn().mockResolvedValue(0),
      markRead: vi.fn(),
      markPopup: vi.fn(),
      markAllPopupsRead: vi.fn().mockResolvedValue(0),
    } as unknown as NotificationRepository;

    service = createNotificationsService({
      repository,
      authorizer,
      users,
    });
  });

  it("rejects unauthenticated list", async () => {
    await expect(
      service.list(null, { page: 1, pageSize: 10 })
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("rejects forbidden access", async () => {
    vi.mocked(authorizer.allow).mockResolvedValue(false);
    await expect(
      service.list(DEV_STUB_IDENTITY, { page: 1, pageSize: 10 })
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("lists only via authenticated subject — never trusts client recipient", async () => {
    vi.mocked(repository.list).mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 1,
    });
    await service.list(DEV_STUB_IDENTITY, { page: 1, pageSize: 10 });
    expect(repository.list).toHaveBeenCalledWith(
      DEV_STUB_IDENTITY.organizationId,
      DEV_STUB_IDENTITY.subjectId,
      expect.objectContaining({ page: 1, pageSize: 10 })
    );
  });

  it("createForRecipients rejects empty and oversized fan-out", async () => {
    await expect(
      service.createForRecipients({
        organizationId: DEV_STUB_IDENTITY.organizationId!,
        createdBy: DEV_STUB_IDENTITY.subjectId,
        recipients: [],
      })
    ).rejects.toBeInstanceOf(ValidationAppError);

    const tooMany = Array.from({ length: 501 }, (_, i) => ({
      recipientUserId: `user-${i}`,
      title: "T",
      message: "M",
      referenceType: "tasks" as const,
    }));
    await expect(
      service.createForRecipients({
        organizationId: DEV_STUB_IDENTITY.organizationId!,
        createdBy: DEV_STUB_IDENTITY.subjectId,
        recipients: tooMany,
      })
    ).rejects.toBeInstanceOf(ValidationAppError);
  });

  it("createForRecipients persists bounded recipients", async () => {
    const created = [makeNotification()];
    vi.mocked(repository.insertMany).mockResolvedValue(created);

    const result = await service.createForRecipients({
      organizationId: DEV_STUB_IDENTITY.organizationId!,
      createdBy: "actor-1",
      recipients: [
        {
          recipientUserId: "owner-1",
          title: "Task management",
          message: "You were assigned TASK-1",
          referenceType: "tasks",
          referenceModuleId: "dddddddddddddddddddddddd",
          popUpStatus: "unread",
        },
      ],
    });

    expect(result).toEqual(created);
    expect(repository.insertMany).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: DEV_STUB_IDENTITY.organizationId,
        createdBy: "actor-1",
        recipients: [
          expect.objectContaining({
            recipientUserId: "owner-1",
            popUpStatus: "unread",
          }),
        ],
      })
    );
  });

  it("getById hides other recipients as not found", async () => {
    vi.mocked(repository.findById).mockResolvedValue(
      makeNotification({ recipientUserId: "someone-else" })
    );
    await expect(
      service.getById(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa")
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("markRead updates only recipient-owned notification", async () => {
    const updated = makeNotification({
      read: { status: "read", on: new Date() },
    });
    vi.mocked(repository.markRead).mockResolvedValue(updated);
    const result = await service.markRead(
      DEV_STUB_IDENTITY,
      "aaaaaaaaaaaaaaaaaaaaaaaa"
    );
    expect(result.read.status).toBe("read");
    expect(repository.markRead).toHaveBeenCalledWith(
      DEV_STUB_IDENTITY.organizationId,
      DEV_STUB_IDENTITY.subjectId,
      "aaaaaaaaaaaaaaaaaaaaaaaa",
      expect.any(Date)
    );
  });

  it("markAllSent and unsentCount are recipient-scoped", async () => {
    vi.mocked(repository.countUnsent).mockResolvedValue(3);
    vi.mocked(repository.markAllSent).mockResolvedValue(3);

    await expect(service.unsentCount(DEV_STUB_IDENTITY)).resolves.toEqual({
      count: 3,
    });
    await expect(service.markAllSent(DEV_STUB_IDENTITY)).resolves.toEqual({
      modifiedCount: 3,
    });

    expect(repository.countUnsent).toHaveBeenCalledWith(
      DEV_STUB_IDENTITY.organizationId,
      DEV_STUB_IDENTITY.subjectId
    );
    expect(repository.markAllSent).toHaveBeenCalledWith(
      DEV_STUB_IDENTITY.organizationId,
      DEV_STUB_IDENTITY.subjectId,
      expect.any(Date)
    );
  });

  it("broadcast creates Notice for all org users via users port", async () => {
    vi.mocked(users.listActiveUserIds).mockResolvedValue(["u1", "u2"]);
    const created = [
      makeNotification({ recipientUserId: "u1", title: "Notice" }),
      makeNotification({
        id: "bbbbbbbbbbbbbbbbbbbbbbbb",
        recipientUserId: "u2",
        title: "Notice",
      }),
    ];
    vi.mocked(repository.insertMany).mockResolvedValue(created);

    const result = await service.broadcast(DEV_STUB_IDENTITY, {
      message: "System maintenance tonight",
      audience: "heads-of-service",
    });

    expect(result.createdCount).toBe(2);
    expect(repository.insertMany).toHaveBeenCalledWith(
      expect.objectContaining({
        recipients: expect.arrayContaining([
          expect.objectContaining({
            title: "Notice",
            referenceType: "notifications",
            popUpStatus: "unread",
            isOrganizational: true,
          }),
        ]),
      })
    );
  });

  it("broadcast rejects oversized message", async () => {
    await expect(
      service.broadcast(DEV_STUB_IDENTITY, {
        message: "x".repeat(151),
      })
    ).rejects.toBeInstanceOf(ValidationAppError);
  });
});
