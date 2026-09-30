import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEV_STUB_IDENTITY, type Authorizer } from "../src/security";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationAppError,
} from "../src/shared";
import type { CalendarListScopePort } from "../src/modules/calendar/ports";
import type { CalendarEventRepository } from "../src/modules/calendar/repositories/calendar-event.repository";
import {
  applyTimeOfDay,
  createCalendarService,
} from "../src/modules/calendar/services/calendar.service";
import type { CalendarEvent } from "../src/modules/calendar/types";

function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  const now = new Date("2026-06-15T10:00:00.000Z");
  return {
    id: "aaaaaaaaaaaaaaaaaaaaaaaa",
    organizationId: DEV_STUB_IDENTITY.organizationId!,
    reference: "",
    title: "Team planning",
    description: "Quarterly planning slot",
    start: now,
    end: new Date("2026-06-15T11:00:00.000Z"),
    color: "default",
    systemEventId: null,
    eventReference: null,
    attendeeIds: [],
    groupIds: [],
    createdBy: DEV_STUB_IDENTITY.subjectId,
    createdOn: now,
    updatedBy: null,
    updatedOn: null,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("applyTimeOfDay", () => {
  it("applies HH:mm onto UTC components", () => {
    const base = new Date("2026-03-01T00:00:00.000Z");
    const result = applyTimeOfDay(base, "09:30");
    expect(result.toISOString()).toBe("2026-03-01T09:30:00.000Z");
  });

  it("returns original when time missing or invalid", () => {
    const base = new Date("2026-03-01T12:00:00.000Z");
    expect(applyTimeOfDay(base).toISOString()).toBe(base.toISOString());
    expect(applyTimeOfDay(base, "bad").toISOString()).toBe(base.toISOString());
  });
});

describe("CalendarService", () => {
  let repository: CalendarEventRepository;
  let listScope: CalendarListScopePort;
  let authorizer: Authorizer;
  let service: ReturnType<typeof createCalendarService>;

  const createInput = {
    title: "Team planning",
    start: "2026-06-15T10:00:00.000Z",
    end: "2026-06-15T11:00:00.000Z",
    description: "Quarterly planning slot",
  };

  beforeEach(() => {
    repository = {
      create: vi.fn(),
      findById: vi.fn(),
      findBySystemEvent: vi.fn(),
      list: vi.fn(),
      update: vi.fn(),
      upsertBySystemEvent: vi.fn(),
      softDelete: vi.fn(),
      softDeleteBySystemEvent: vi.fn(),
    };
    listScope = {
      resolveScope: vi.fn().mockResolvedValue({ mode: "all" }),
    };
    authorizer = {
      allow: vi.fn().mockResolvedValue(true),
    };
    service = createCalendarService({
      repository,
      authorizer,
      listScope,
    });
  });

  it("rejects unauthenticated create", async () => {
    await expect(service.create(null, createInput)).rejects.toBeInstanceOf(
      UnauthorizedError
    );
  });

  it("rejects forbidden list", async () => {
    vi.mocked(authorizer.allow).mockResolvedValue(false);
    await expect(
      service.list(DEV_STUB_IDENTITY, {
        page: 1,
        pageSize: 20,
        sort: "start",
        sortDir: "asc",
      })
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("creates a standalone event with default colour", async () => {
    const created = makeEvent();
    vi.mocked(repository.create).mockResolvedValue(created);

    const result = await service.create(DEV_STUB_IDENTITY, createInput);

    expect(result).toEqual(created);
    expect(repository.create).toHaveBeenCalledWith(
      DEV_STUB_IDENTITY.organizationId,
      expect.objectContaining({
        title: "Team planning",
        color: "default",
        systemEventId: null,
        eventReference: null,
        reference: "",
        groupIds: [],
      })
    );
    expect(authorizer.allow).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "create",
        resourceType: "calendar",
      })
    );
  });

  it("rejects end before start", async () => {
    await expect(
      service.create(DEV_STUB_IDENTITY, {
        title: "Bad range",
        start: "2026-06-15T12:00:00.000Z",
        end: "2026-06-15T11:00:00.000Z",
      })
    ).rejects.toBeInstanceOf(ValidationAppError);
  });

  it("uses create permission for update (spec)", async () => {
    vi.mocked(repository.findById).mockResolvedValue(makeEvent());
    vi.mocked(repository.update).mockResolvedValue(
      makeEvent({ title: "Updated" })
    );

    await service.update(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa", {
      title: "Updated",
    });

    expect(authorizer.allow).toHaveBeenCalledWith(
      expect.objectContaining({ action: "create" })
    );
  });

  it("blocks update of linked events", async () => {
    vi.mocked(repository.findById).mockResolvedValue(
      makeEvent({
        systemEventId: "bbbbbbbbbbbbbbbbbbbbbbbb",
        eventReference: "task",
      })
    );

    await expect(
      service.update(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa", {
        title: "Nope",
      })
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("blocks delete of linked events", async () => {
    vi.mocked(repository.findById).mockResolvedValue(
      makeEvent({
        systemEventId: "bbbbbbbbbbbbbbbbbbbbbbbb",
        eventReference: "incident",
        color: "red",
      })
    );

    await expect(
      service.remove(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa")
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("soft-deletes standalone events", async () => {
    vi.mocked(repository.findById).mockResolvedValue(makeEvent());
    vi.mocked(repository.softDelete).mockResolvedValue(true);

    await service.remove(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa");

    expect(repository.softDelete).toHaveBeenCalledWith(
      DEV_STUB_IDENTITY.organizationId,
      "aaaaaaaaaaaaaaaaaaaaaaaa"
    );
  });

  it("returns not found for missing event", async () => {
    vi.mocked(repository.findById).mockResolvedValue(null);
    await expect(
      service.getById(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa")
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("upserts system events without authorizer checks", async () => {
    const linked = makeEvent({
      systemEventId: "cccccccccccccccccccccccc",
      eventReference: "supplier",
      color: "orange",
    });
    vi.mocked(repository.upsertBySystemEvent).mockResolvedValue(linked);

    const result = await service.upsertSystemEvent({
      organizationId: DEV_STUB_IDENTITY.organizationId!,
      systemEventId: "cccccccccccccccccccccccc",
      eventReference: "supplier",
      title: "Acme review",
      description: "Supplier review",
      start: new Date("2026-07-01T00:00:00.000Z"),
      end: new Date("2026-07-01T00:00:00.000Z"),
      color: "orange",
      actorId: "system:suppliers",
    });

    expect(result.color).toBe("orange");
    expect(authorizer.allow).not.toHaveBeenCalled();
  });

  it("lists via resolved scope", async () => {
    vi.mocked(repository.list).mockResolvedValue({
      items: [makeEvent()],
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });

    const listed = await service.list(DEV_STUB_IDENTITY, {
      page: 1,
      pageSize: 20,
      sort: "start",
      sortDir: "asc",
    });

    expect(listed.total).toBe(1);
    expect(listScope.resolveScope).toHaveBeenCalled();
  });
});
