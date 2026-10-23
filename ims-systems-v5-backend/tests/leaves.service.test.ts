import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Authorizer, SecurityIdentity } from "../src/security";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationAppError,
} from "../src/shared";
import {
  calculateWorkingDays,
  createLeavesService,
  listPublicHolidays,
  type Leave,
  type LeaveRepository,
  type LeavesCalendarPort,
  type LeavesMembershipPort,
  type LeavesNotificationPort,
} from "../src/modules/leaves";

const ORG = "507f1f77bcf86cd799439012";
const STAFF = "507f1f77bcf86cd799439011";
const MANAGER = "507f1f77bcf86cd799439013";
const OTHER = "507f1f77bcf86cd799439014";

function identityFor(subjectId: string): SecurityIdentity {
  return { subjectId, organizationId: ORG, email: `${subjectId}@example.com` };
}

function inMemoryRepository(): LeaveRepository {
  const rows = new Map<string, Leave>();
  let seq = 0;
  return {
    async create(organizationId, input) {
      seq += 1;
      const now = new Date();
      const leave: Leave = {
        id: `aaaaaaaaaaaaaaaaaaaa${String(seq).padStart(4, "0")}`,
        organizationId,
        ...input,
        updatedBy: null,
        updatedOn: null,
        createdAt: now,
        updatedAt: now,
      };
      rows.set(leave.id, leave);
      return leave;
    },
    async findById(organizationId, id) {
      const leave = rows.get(id);
      return leave && leave.organizationId === organizationId ? leave : null;
    },
    async list(_organizationId, filter) {
      const items = [...rows.values()].filter((leave) =>
        filter.scope === "mine"
          ? leave.createdBy === filter.actorId
          : leave.createdBy !== filter.actorId &&
            (leave.submission.lineManagerIds.includes(filter.actorId) ||
              filter.managedUserIds.includes(leave.createdBy))
      );
      return {
        items,
        page: filter.page,
        pageSize: filter.pageSize,
        total: items.length,
        totalPages: 1,
      };
    },
    async update(_organizationId, id, patch) {
      const existing = rows.get(id);
      if (!existing) return null;
      const next: Leave = { ...existing, ...patch };
      rows.set(id, next);
      return next;
    },
    async delete(_organizationId, id) {
      return rows.delete(id);
    },
    async nextReference(_organizationId, type) {
      const prefix = type === "Annual leave" ? "AL" : "SIC";
      const count = [...rows.values()].filter((l) => l.type === type).length;
      return `${prefix}-${count + 1}`;
    },
  };
}

describe("calculateWorkingDays", () => {
  const base = {
    startDayFraction: 1,
    endDayFraction: 1,
    countryCode: "GB",
  };

  it("counts an inclusive Mon–Fri range", () => {
    expect(
      calculateWorkingDays({
        ...base,
        startDate: new Date("2026-10-26"),
        endDate: new Date("2026-10-30"),
      })
    ).toBe(5);
  });

  it("excludes weekends", () => {
    expect(
      calculateWorkingDays({
        ...base,
        startDate: new Date("2026-10-23"),
        endDate: new Date("2026-10-26"),
      })
    ).toBe(2);
  });

  it("excludes public holidays for the country", () => {
    expect(
      calculateWorkingDays({
        ...base,
        startDate: new Date("2026-12-21"),
        endDate: new Date("2026-12-25"),
      })
    ).toBe(4);
  });

  it("applies start and end day fractions", () => {
    expect(
      calculateWorkingDays({
        startDate: new Date("2026-10-26"),
        endDate: new Date("2026-10-28"),
        startDayFraction: 0.5,
        endDayFraction: 0.75,
        countryCode: "GB",
      })
    ).toBe(2.25);
  });

  it("uses the smaller fraction for a single day", () => {
    expect(
      calculateWorkingDays({
        startDate: new Date("2026-10-26"),
        endDate: new Date("2026-10-26"),
        startDayFraction: 0.75,
        endDayFraction: 0.5,
        countryCode: "GB",
      })
    ).toBe(0.5);
  });

  it("lists public holidays for a country and year", () => {
    const holidays = listPublicHolidays("GB", 2026);
    expect(holidays.some((h) => h.date === "2026-12-25")).toBe(true);
  });
});

describe("LeavesService", () => {
  let repository: LeaveRepository;
  let notifications: LeavesNotificationPort;
  let calendar: LeavesCalendarPort;
  let memberships: LeavesMembershipPort;
  let authorizer: Authorizer;
  let lineManagersByUser: Record<string, string[]>;
  let service: ReturnType<typeof createLeavesService>;

  const createInput = {
    type: "Annual leave" as const,
    description: "Family holiday",
    startDate: new Date("2026-10-26"),
    endDate: new Date("2026-10-30"),
    startDayFraction: 1,
    endDayFraction: 1,
  };

  beforeEach(() => {
    repository = inMemoryRepository();
    notifications = {
      notifySubmitted: vi.fn(async () => undefined),
      notifyDecision: vi.fn(async () => undefined),
    };
    calendar = { upsertLeaveEvent: vi.fn(async () => undefined) };
    lineManagersByUser = { [STAFF]: [MANAGER] };
    memberships = {
      getProfile: vi.fn(async ({ userId }) => ({
        lineManagerIds: lineManagersByUser[userId] ?? [],
        country: { name: "United Kingdom", code: "GB" },
      })),
      listManagedUserIds: vi.fn(async ({ managerId }) =>
        Object.entries(lineManagersByUser)
          .filter(([, managers]) => managers.includes(managerId))
          .map(([userId]) => userId)
      ),
    };
    authorizer = { allow: vi.fn().mockResolvedValue(true) };
    service = createLeavesService({
      repository,
      authorizer,
      notifications,
      calendar,
      memberships,
    });
  });

  it("creates a draft with calculated days and copied line managers", async () => {
    const leave = await service.create(identityFor(STAFF), createInput);

    expect(leave.reference).toBe("AL-1");
    expect(leave.days).toBe(5);
    expect(leave.country.code).toBe("GB");
    expect(leave.submission.status).toBe("Draft");
    expect(leave.submission.lineManagerIds).toEqual([MANAGER]);
    expect(authorizer.allow).toHaveBeenCalledWith(
      expect.objectContaining({ resourceType: "leaves", action: "create" })
    );
  });

  it("runs create → submit → approve", async () => {
    const created = await service.create(identityFor(STAFF), createInput);

    const submitted = await service.submit(identityFor(STAFF), created.id);
    expect(submitted.submission.status).toBe("Pending");
    expect(submitted.submission.submissionDate).toBeInstanceOf(Date);
    expect(notifications.notifySubmitted).toHaveBeenCalledWith(
      expect.objectContaining({
        leaveId: created.id,
        lineManagerIds: [MANAGER],
      })
    );

    const approved = await service.evaluate(identityFor(MANAGER), created.id, {
      status: "Approved",
    });
    expect(approved.submission.status).toBe("Approved");
    expect(approved.submission.decisionMakerId).toBe(MANAGER);
    expect(approved.submission.decisionDate).toBeInstanceOf(Date);
    expect(calendar.upsertLeaveEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        leaveId: created.id,
        requesterId: STAFF,
        startDate: createInput.startDate,
        endDate: createInput.endDate,
      })
    );
    expect(notifications.notifyDecision).toHaveBeenCalledWith(
      expect.objectContaining({ status: "Approved", requesterId: STAFF })
    );
  });

  it("rejects without adding a calendar event", async () => {
    const created = await service.create(identityFor(STAFF), createInput);
    await service.submit(identityFor(STAFF), created.id);

    const rejected = await service.evaluate(identityFor(MANAGER), created.id, {
      status: "Rejected",
    });
    expect(rejected.submission.status).toBe("Rejected");
    expect(calendar.upsertLeaveEvent).not.toHaveBeenCalled();
  });

  it("blocks evaluation by users who are not line managers", async () => {
    const created = await service.create(identityFor(STAFF), createInput);
    await service.submit(identityFor(STAFF), created.id);

    // Staff is not listed as a manager when managers are configured.
    await expect(
      service.evaluate(identityFor(STAFF), created.id, { status: "Approved" })
    ).rejects.toBeInstanceOf(ForbiddenError);
    await expect(
      service.evaluate(identityFor(OTHER), created.id, { status: "Approved" })
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("defaults the requester as line manager when none are configured", async () => {
    lineManagersByUser = {};
    const created = await service.create(identityFor(STAFF), createInput);
    expect(created.submission.lineManagerIds).toEqual([STAFF]);

    const submitted = await service.submit(identityFor(STAFF), created.id);
    expect(submitted.submission.status).toBe("Pending");
    expect(submitted.submission.lineManagerIds).toEqual([STAFF]);

    const approved = await service.evaluate(identityFor(STAFF), created.id, {
      status: "Approved",
    });
    expect(approved.submission.status).toBe("Approved");
  });

  it("creates ongoing sick leave and can submit immediately", async () => {
    const ongoing = await service.create(identityFor(STAFF), {
      ...createInput,
      type: "Sick leave",
      ongoing: true,
    });
    expect(ongoing.reference).toBe("SIC-1");
    expect(ongoing.submission.status).toBe("Ongoing");

    const submitted = await service.create(identityFor(STAFF), {
      ...createInput,
      type: "Sick leave",
      ongoing: true,
      submitImmediately: true,
    });
    expect(submitted.submission.status).toBe("Pending");
    expect(notifications.notifySubmitted).toHaveBeenCalledTimes(1);
  });

  it("rejects ongoing annual leave", async () => {
    await expect(
      service.create(identityFor(STAFF), { ...createInput, ongoing: true })
    ).rejects.toBeInstanceOf(ValidationAppError);
  });

  it("recalculates days with fractions on update", async () => {
    const created = await service.create(identityFor(STAFF), createInput);

    const updated = await service.update(identityFor(STAFF), created.id, {
      startDayFraction: 0.5,
      endDayFraction: 0.5,
    });
    expect(updated.days).toBe(4);

    const shortened = await service.update(identityFor(STAFF), created.id, {
      endDate: new Date("2026-10-28"),
    });
    expect(shortened.days).toBe(2);
  });

  it("does not allow editing decided leave", async () => {
    const created = await service.create(identityFor(STAFF), createInput);
    await service.submit(identityFor(STAFF), created.id);
    await service.evaluate(identityFor(MANAGER), created.id, {
      status: "Approved",
    });

    await expect(
      service.update(identityFor(STAFF), created.id, { description: "Changed" })
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("deletes drafts only", async () => {
    const draft = await service.create(identityFor(STAFF), createInput);
    const pending = await service.create(identityFor(STAFF), createInput);
    await service.submit(identityFor(STAFF), pending.id);

    await expect(
      service.remove(identityFor(STAFF), pending.id)
    ).rejects.toBeInstanceOf(ConflictError);

    await service.remove(identityFor(STAFF), draft.id);
    await expect(
      service.getById(identityFor(STAFF), draft.id)
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("limits wallet access to owner, line managers and their managers", async () => {
    const created = await service.create(identityFor(STAFF), createInput);

    await expect(
      service.getById(identityFor(STAFF), created.id)
    ).resolves.toMatchObject({ id: created.id });
    await expect(
      service.getById(identityFor(MANAGER), created.id)
    ).resolves.toMatchObject({ id: created.id });
    await expect(
      service.getById(identityFor(OTHER), created.id)
    ).rejects.toBeInstanceOf(ForbiddenError);

    lineManagersByUser = { [STAFF]: [OTHER] };
    await expect(
      service.getById(identityFor(OTHER), created.id)
    ).resolves.toMatchObject({ id: created.id });
  });

  it("lists own and managed requests by scope", async () => {
    await service.create(identityFor(STAFF), createInput);

    const mine = await service.list(identityFor(STAFF), {
      page: 1,
      pageSize: 20,
      scope: "mine",
    });
    const managed = await service.list(identityFor(MANAGER), {
      page: 1,
      pageSize: 20,
      scope: "managed",
    });
    const managerOwn = await service.list(identityFor(MANAGER), {
      page: 1,
      pageSize: 20,
      scope: "mine",
    });

    expect(mine.items).toHaveLength(1);
    expect(managed.items).toHaveLength(1);
    expect(managerOwn.items).toHaveLength(0);
  });

  it("returns public holidays for the member country by default", async () => {
    const result = await service.listHolidays(identityFor(STAFF), {
      year: 2026,
    });
    expect(result.countryCode).toBe("GB");
    expect(result.items.some((h) => h.date === "2026-12-25")).toBe(true);
  });

  it("requires an authenticated organisation identity", async () => {
    await expect(service.create(null, createInput)).rejects.toBeInstanceOf(
      UnauthorizedError
    );
    await expect(
      service.create({ subjectId: STAFF }, createInput)
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("denies when the authorizer refuses", async () => {
    authorizer = { allow: vi.fn().mockResolvedValue(false) };
    service = createLeavesService({
      repository,
      authorizer,
      notifications,
      calendar,
      memberships,
    });
    await expect(
      service.create(identityFor(STAFF), createInput)
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});
