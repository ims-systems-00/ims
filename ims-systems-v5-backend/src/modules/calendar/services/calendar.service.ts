/**
 * Calendar application service.
 * Spec: docs/module-specifications/calendar.md
 */

import type { Authorizer, SecurityIdentity } from "../../../security";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationAppError,
} from "../../../shared";
import type { CalendarListScopePort } from "../ports";
import type { CalendarEventRepository } from "../repositories/calendar-event.repository";
import {
  CALENDAR_RESOURCE,
  isLinkedEvent,
  type CalendarEvent,
  type CalendarEventColor,
  type CalendarEventReference,
  type CreateCalendarEventInput,
  type ListCalendarEventsQuery,
  type PaginatedCalendarEvents,
  type UpdateCalendarEventInput,
} from "../types";

function requireOrgIdentity(identity: SecurityIdentity | null | undefined): {
  identity: SecurityIdentity;
  organizationId: string;
} {
  if (!identity?.subjectId) {
    throw new UnauthorizedError();
  }
  if (!identity.organizationId) {
    throw new ForbiddenError("Organisation context is required");
  }
  return { identity, organizationId: identity.organizationId };
}

function toDate(value: string | Date, field: string): Date {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ValidationAppError(`Invalid ${field} date`, [
      { path: field, message: `Invalid ${field} date` },
    ]);
  }
  return date;
}

function assertValidRange(start: Date, end: Date): void {
  if (end.getTime() < start.getTime()) {
    throw new ValidationAppError("End must be on or after start", [
      { path: "end", message: "End must be on or after start" },
    ]);
  }
}

/**
 * Apply optional HH:mm wall-clock time onto a date's UTC components.
 * Spec has no timezone model; stored as Date (ISO-8601 at the API boundary).
 */
export function applyTimeOfDay(date: Date, time?: string): Date {
  const result = new Date(date.getTime());
  if (!time?.trim()) return result;
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return result;
  result.setUTCHours(Number(match[1]), Number(match[2]), 0, 0);
  return result;
}

export type UpsertSystemEventInput = {
  organizationId: string;
  systemEventId: string;
  eventReference: CalendarEventReference;
  title: string;
  description: string;
  start: Date;
  end: Date;
  color: CalendarEventColor;
  attendeeIds?: string[];
  groupIds?: string[];
  actorId: string;
};

export type CalendarServiceDeps = {
  repository: CalendarEventRepository;
  authorizer: Authorizer;
  listScope: CalendarListScopePort;
};

export type CalendarService = ReturnType<typeof createCalendarService>;

export function createCalendarService(deps: CalendarServiceDeps) {
  const { repository, authorizer, listScope } = deps;

  async function assertAllowed(
    identity: SecurityIdentity,
    action: string,
    resourceId?: string
  ): Promise<void> {
    const allowed = await authorizer.allow({
      identity,
      action,
      resourceType: CALENDAR_RESOURCE,
      resourceId,
      organizationId: identity.organizationId,
    });
    if (!allowed) {
      throw new ForbiddenError(
        "User does not have permission to access Calendar"
      );
    }
  }

  async function requireEvent(
    organizationId: string,
    id: string
  ): Promise<CalendarEvent> {
    const event = await repository.findById(organizationId, id);
    if (!event) {
      throw new NotFoundError("Calendar event not found");
    }
    return event;
  }

  function assertStandaloneMutable(event: CalendarEvent): void {
    if (isLinkedEvent(event)) {
      throw new ConflictError(
        "Linked calendar events must be changed from their source module"
      );
    }
  }

  return {
    async list(
      identity: SecurityIdentity | null | undefined,
      query: ListCalendarEventsQuery
    ): Promise<PaginatedCalendarEvents> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "read");
      const scope = await listScope.resolveScope({
        organizationId: actor.organizationId,
        subjectId: actor.identity.subjectId,
      });
      return repository.list(actor.organizationId, query, scope);
    },

    async getById(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<CalendarEvent> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "read", id);
      return requireEvent(actor.organizationId, id);
    },

    async create(
      identity: SecurityIdentity | null | undefined,
      input: CreateCalendarEventInput
    ): Promise<CalendarEvent> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "create");

      const start = toDate(input.start, "start");
      const end = toDate(input.end, "end");
      assertValidRange(start, end);

      const now = new Date();
      return repository.create(actor.organizationId, {
        reference: "",
        title: input.title.trim(),
        description: input.description?.trim() ?? "",
        start,
        end,
        color: "default",
        systemEventId: null,
        eventReference: null,
        attendeeIds: [],
        groupIds: [],
        createdBy: actor.identity.subjectId,
        createdOn: now,
      });
    },

    async update(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: UpdateCalendarEventInput
    ): Promise<CalendarEvent> {
      const actor = requireOrgIdentity(identity);
      // Spec / V4: calendar edit uses CREATE permission, not UPDATE.
      await assertAllowed(actor.identity, "create", id);

      const existing = await requireEvent(actor.organizationId, id);
      assertStandaloneMutable(existing);

      const start =
        input.start !== undefined
          ? toDate(input.start, "start")
          : existing.start;
      const end =
        input.end !== undefined ? toDate(input.end, "end") : existing.end;
      assertValidRange(start, end);

      const updated = await repository.update(actor.organizationId, id, {
        title: input.title?.trim(),
        description:
          input.description !== undefined
            ? input.description.trim()
            : undefined,
        start: input.start !== undefined ? start : undefined,
        end: input.end !== undefined ? end : undefined,
        updatedBy: actor.identity.subjectId,
        updatedOn: new Date(),
      });
      if (!updated) {
        throw new NotFoundError("Calendar event not found");
      }
      return updated;
    },

    async remove(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<void> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "delete", id);

      const existing = await requireEvent(actor.organizationId, id);
      assertStandaloneMutable(existing);

      const deleted = await repository.softDelete(actor.organizationId, id);
      if (!deleted) {
        throw new NotFoundError("Calendar event not found");
      }
    },

    /**
     * System upsert used by source-module adapters (no HTTP authz).
     * Idempotent on (organizationId, systemEventId, eventReference).
     */
    async upsertSystemEvent(
      input: UpsertSystemEventInput
    ): Promise<CalendarEvent> {
      assertValidRange(input.start, input.end);
      return repository.upsertBySystemEvent(input.organizationId, {
        title: input.title,
        description: input.description,
        start: input.start,
        end: input.end,
        color: input.color,
        systemEventId: input.systemEventId,
        eventReference: input.eventReference,
        attendeeIds: input.attendeeIds ?? [],
        groupIds: input.groupIds ?? [],
        createdBy: input.actorId,
        createdOn: new Date(),
      });
    },

    async removeSystemEvent(input: {
      organizationId: string;
      systemEventId: string;
      eventReference: CalendarEventReference;
    }): Promise<void> {
      await repository.softDeleteBySystemEvent(
        input.organizationId,
        input.systemEventId,
        input.eventReference
      );
    },
  };
}
