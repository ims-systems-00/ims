/**
 * Calendar domain types.
 * Spec: docs/module-specifications/calendar.md
 *
 * Calendar is a read-mostly aggregation surface for module dates plus
 * light standalone event CRUD. No recurrence, reminders, or conflicts.
 */

export const CALENDAR_EVENT_REFERENCES = [
  "supplier",
  "managementreview",
  "audit",
  "incident",
  "task",
  "leave",
] as const;
export type CalendarEventReference =
  (typeof CALENDAR_EVENT_REFERENCES)[number];

export const CALENDAR_EVENT_COLORS = [
  "default",
  "orange",
  "green",
  "red",
  "azure",
  "purple",
] as const;
export type CalendarEventColor = (typeof CALENDAR_EVENT_COLORS)[number];

export type CalendarEvent = {
  id: string;
  organizationId: string;
  /** Present on schema for parity; standalone events leave empty (spec). */
  reference: string;
  title: string;
  description: string;
  start: Date;
  end: Date;
  color: CalendarEventColor;
  /** When set, event is linked to a source module and is read-only via Calendar HTTP. */
  systemEventId: string | null;
  eventReference: CalendarEventReference | null;
  attendeeIds: string[];
  /** Business-unit visibility groups (spec `groups`; avoids V4 singular `group` mismatch). */
  groupIds: string[];
  createdBy: string;
  createdOn: Date;
  updatedBy: string | null;
  updatedOn: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateCalendarEventInput = {
  title: string;
  start: string | Date;
  end: string | Date;
  description?: string;
  /** Standalone creates always use default; ignored if clients send another value. */
  color?: CalendarEventColor;
};

export type UpdateCalendarEventInput = {
  title?: string;
  start?: string | Date;
  end?: string | Date;
  description?: string;
};

export type ListCalendarEventsQuery = {
  page: number;
  pageSize: number;
  search?: string;
  /** Inclusive lower bound — events overlapping [from, to]. */
  from?: Date;
  /** Inclusive upper bound — events overlapping [from, to]. */
  to?: Date;
  eventReferences?: CalendarEventReference[];
  colors?: CalendarEventColor[];
  /** When true, only standalone (non-linked) events. */
  standaloneOnly?: boolean;
  sort?: "start" | "end" | "createdOn" | "title" | "updatedAt";
  sortDir?: "asc" | "desc";
};

export type PaginatedCalendarEvents = {
  items: CalendarEvent[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

/** Authz resource type (IMS_SERVICES.CALENDAR → calendar in V5). */
export const CALENDAR_RESOURCE = "calendar";

export function isCalendarEventReference(
  value: string
): value is CalendarEventReference {
  return (CALENDAR_EVENT_REFERENCES as readonly string[]).includes(value);
}

export function isCalendarEventColor(value: string): value is CalendarEventColor {
  return (CALENDAR_EVENT_COLORS as readonly string[]).includes(value);
}

export function isLinkedEvent(event: {
  systemEventId: string | null;
}): boolean {
  return Boolean(event.systemEventId);
}
