/**
 * Calendar frontend types — aligned with backend `/api/v1/calendar`.
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

export const CALENDAR_VIEWS = ["month", "week", "day", "agenda"] as const;
export type CalendarView = (typeof CALENDAR_VIEWS)[number];

export type CalendarEvent = {
  id: string;
  organizationId: string;
  reference: string;
  title: string;
  description: string;
  start: string;
  end: string;
  color: CalendarEventColor;
  systemEventId: string | null;
  eventReference: CalendarEventReference | null;
  attendeeIds: string[];
  groupIds: string[];
  createdBy: string;
  createdOn: string;
  updatedBy: string | null;
  updatedOn: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateCalendarEventInput = {
  title: string;
  start: string;
  end: string;
  description?: string;
};

export type UpdateCalendarEventInput = {
  title?: string;
  start?: string;
  end?: string;
  description?: string;
};

export type ListCalendarEventsParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  from?: string;
  to?: string;
  eventReferences?: CalendarEventReference[];
  colors?: CalendarEventColor[];
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

export function isLinkedEvent(event: {
  systemEventId: string | null;
}): boolean {
  return Boolean(event.systemEventId);
}

export const EVENT_REFERENCE_LABELS: Record<CalendarEventReference, string> = {
  supplier: "Supplier",
  managementreview: "Management review",
  audit: "Audit",
  incident: "Incident",
  task: "Task",
  leave: "Leave",
};
