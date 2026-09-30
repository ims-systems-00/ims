import { apiRequest } from "@/shared/lib/http";
import type {
  CreateCalendarEventInput,
  CalendarEvent,
  ListCalendarEventsParams,
  PaginatedCalendarEvents,
  UpdateCalendarEventInput,
} from "../types";

function toQuery(params: ListCalendarEventsParams = {}): string {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.pageSize) search.set("pageSize", String(params.pageSize));
  if (params.search) search.set("search", params.search);
  if (params.from) search.set("from", params.from);
  if (params.to) search.set("to", params.to);
  if (params.eventReferences?.length) {
    search.set("eventReferences", params.eventReferences.join(","));
  }
  if (params.colors?.length) {
    search.set("colors", params.colors.join(","));
  }
  if (params.standaloneOnly !== undefined) {
    search.set("standaloneOnly", String(params.standaloneOnly));
  }
  if (params.sort) search.set("sort", params.sort);
  if (params.sortDir) search.set("sortDir", params.sortDir);
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function listCalendarEvents(
  params?: ListCalendarEventsParams
): Promise<PaginatedCalendarEvents> {
  return apiRequest<PaginatedCalendarEvents>(`/calendar${toQuery(params)}`);
}

export function getCalendarEvent(id: string): Promise<CalendarEvent> {
  return apiRequest<CalendarEvent>(`/calendar/${id}`);
}

export function createCalendarEvent(
  body: CreateCalendarEventInput
): Promise<CalendarEvent> {
  return apiRequest<CalendarEvent>("/calendar", { method: "POST", body });
}

export function updateCalendarEvent(
  id: string,
  body: UpdateCalendarEventInput
): Promise<CalendarEvent> {
  return apiRequest<CalendarEvent>(`/calendar/${id}`, {
    method: "PATCH",
    body,
  });
}

export function deleteCalendarEvent(
  id: string
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/calendar/${id}`, {
    method: "DELETE",
  });
}
