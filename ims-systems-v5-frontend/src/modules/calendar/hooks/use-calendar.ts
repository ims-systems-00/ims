import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  getCalendarEvent,
  listCalendarEvents,
  updateCalendarEvent,
} from "../api/calendar";
import type {
  CreateCalendarEventInput,
  ListCalendarEventsParams,
  UpdateCalendarEventInput,
} from "../types";

export const calendarKeys = {
  all: ["calendar"] as const,
  lists: () => [...calendarKeys.all, "list"] as const,
  list: (params: ListCalendarEventsParams) =>
    [...calendarKeys.lists(), params] as const,
  details: () => [...calendarKeys.all, "detail"] as const,
  detail: (id: string) => [...calendarKeys.details(), id] as const,
};

async function invalidateCalendarQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  id?: string
) {
  await queryClient.invalidateQueries({ queryKey: calendarKeys.lists() });
  if (id) {
    await queryClient.invalidateQueries({
      queryKey: calendarKeys.detail(id),
    });
  }
}

export function useCalendarEventsQuery(params: ListCalendarEventsParams) {
  return useQuery({
    queryKey: calendarKeys.list(params),
    queryFn: () => listCalendarEvents(params),
  });
}

export function useCalendarEventQuery(id: string | undefined) {
  return useQuery({
    queryKey: calendarKeys.detail(id ?? ""),
    queryFn: () => getCalendarEvent(id!),
    enabled: Boolean(id),
  });
}

export function useCreateCalendarEventMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateCalendarEventInput) => createCalendarEvent(body),
    onSuccess: async () => {
      await invalidateCalendarQueries(queryClient);
    },
  });
}

export function useUpdateCalendarEventMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateCalendarEventInput) =>
      updateCalendarEvent(id, body),
    onSuccess: async (event) => {
      await invalidateCalendarQueries(queryClient, id);
      queryClient.setQueryData(calendarKeys.detail(id), event);
    },
  });
}

export function useDeleteCalendarEventMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCalendarEvent(id),
    onSuccess: async (_data, id) => {
      await invalidateCalendarQueries(queryClient);
      queryClient.removeQueries({ queryKey: calendarKeys.detail(id) });
    },
  });
}
