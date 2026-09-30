/**
 * Public surface for the Calendar module.
 * Other modules may import only from this entry.
 */

export {
  createCalendarRouter,
  createCalendarModule,
} from "./routes/calendar.routes";
export type { CalendarRouterDeps } from "./routes/calendar.routes";
export { createCalendarService, applyTimeOfDay } from "./services/calendar.service";
export type {
  CalendarService,
  UpsertSystemEventInput,
} from "./services/calendar.service";
export { createCalendarEventRepository } from "./repositories/calendar-event.repository";
export {
  createTaskCalendarAdapter,
  createAuditCalendarAdapter,
  createIncidentCalendarAdapter,
  createSupplierCalendarAdapter,
  createManagementReviewCalendarAdapter,
} from "./adapters/calendar-ports.adapter";
export type {
  CalendarEvent,
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
  ListCalendarEventsQuery,
  PaginatedCalendarEvents,
  CalendarEventColor,
  CalendarEventReference,
} from "./types";
export {
  CALENDAR_RESOURCE,
  CALENDAR_EVENT_COLORS,
  CALENDAR_EVENT_REFERENCES,
  isLinkedEvent,
  isCalendarEventColor,
  isCalendarEventReference,
} from "./types";
export {
  DevAllCalendarListScopeAdapter,
} from "./ports";
export type {
  CalendarListScopePort,
  CalendarListScope,
} from "./ports";
