import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@/shared/theme";
import { CalendarPage } from "@/modules/calendar";
import * as calendarApi from "@/modules/calendar/api/calendar";
import type { CalendarEvent } from "@/modules/calendar/types";
import { ApiClientError } from "@/shared/lib/http/errors";
import {
  breadcrumbsForPath,
  navigationSections,
} from "@/shared/navigation";
import { toDateKey } from "@/modules/calendar/lib/date-utils";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  const now = new Date();
  const start = new Date(now);
  start.setHours(10, 0, 0, 0);
  const end = new Date(now);
  end.setHours(11, 0, 0, 0);
  return {
    id: "aaaaaaaaaaaaaaaaaaaaaaaa",
    organizationId: "000000000000000000000001",
    reference: "",
    title: "Board briefing",
    description: "Monthly board briefing",
    start: start.toISOString(),
    end: end.toISOString(),
    color: "default",
    systemEventId: null,
    eventReference: null,
    attendeeIds: [],
    groupIds: [],
    createdBy: "dev-stub-user",
    createdOn: now.toISOString(),
    updatedBy: null,
    updatedOn: null,
    deletedAt: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    ...overrides,
  };
}

function renderCalendar(initial = "/calendar") {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return render(
    <ThemeProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[initial]}>
          <Routes>
            <Route path="/calendar" element={<CalendarPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

describe("Calendar page", () => {
  it("includes Calendar in navigation", () => {
    const calendar = navigationSections[0]!.items.find(
      (item) => item.id === "calendar"
    );
    expect(calendar?.href).toBe("/calendar");
    expect(breadcrumbsForPath("/calendar", navigationSections)).toEqual([
      { label: "Dashboard", href: "/" },
      { label: "Calendar", href: "/calendar" },
    ]);
  });

  it("shows loading then empty month when there are no events", async () => {
    vi.spyOn(calendarApi, "listCalendarEvents").mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 500,
      total: 0,
      totalPages: 1,
    });

    renderCalendar();

    expect(screen.getByText(/loading calendar events/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.queryByText(/loading calendar events/i)
      ).not.toBeInTheDocument();
    });
    expect(screen.getByRole("heading", { name: "Calendar" })).toBeInTheDocument();
    expect(calendarApi.listCalendarEvents).toHaveBeenCalled();
  });

  it("renders events and opens create sheet", async () => {
    const user = userEvent.setup();
    const event = makeEvent();
    vi.spyOn(calendarApi, "listCalendarEvents").mockResolvedValue({
      items: [event],
      page: 1,
      pageSize: 500,
      total: 1,
      totalPages: 1,
    });

    renderCalendar();

    await waitFor(() => {
      expect(screen.getAllByText("Board briefing").length).toBeGreaterThan(0);
    });

    await user.click(screen.getAllByRole("button", { name: /new event/i })[0]!);
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /create event/i })).toBeInTheDocument();
    });
  });

  it("opens linked event as read-only without edit/delete", async () => {
    const user = userEvent.setup();
    const linked = makeEvent({
      id: "bbbbbbbbbbbbbbbbbbbbbbbb",
      title: "ISO audit",
      color: "green",
      systemEventId: "cccccccccccccccccccccccc",
      eventReference: "audit",
    });
    vi.spyOn(calendarApi, "listCalendarEvents").mockResolvedValue({
      items: [linked],
      page: 1,
      pageSize: 500,
      total: 1,
      totalPages: 1,
    });
    vi.spyOn(calendarApi, "getCalendarEvent").mockResolvedValue(linked);

    renderCalendar(`/calendar?event=${linked.id}`);

    await waitFor(() => {
      expect(screen.getByText(/read-only in calendar/i)).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: /^edit$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^delete$/i })).not.toBeInTheDocument();

    // Keep user referenced for future interactions if needed
    void user;
  });

  it("creates a standalone event via the form", async () => {
    const user = userEvent.setup();
    vi.spyOn(calendarApi, "listCalendarEvents").mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 500,
      total: 0,
      totalPages: 1,
    });
    const createSpy = vi
      .spyOn(calendarApi, "createCalendarEvent")
      .mockResolvedValue(makeEvent({ title: "Kickoff" }));

    renderCalendar("/calendar?create=1");

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /create event/i })).toBeInTheDocument();
    });

    const titleInput = screen.getByLabelText(/^title/i);
    await user.clear(titleInput);
    await user.type(titleInput, "Kickoff");
    await user.click(screen.getByRole("button", { name: /create event/i }));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalled();
    });
    expect(createSpy.mock.calls[0]![0]).toMatchObject({
      title: "Kickoff",
    });
  });

  it("switches to agenda view", async () => {
    const user = userEvent.setup();
    vi.spyOn(calendarApi, "listCalendarEvents").mockResolvedValue({
      items: [makeEvent()],
      page: 1,
      pageSize: 500,
      total: 1,
      totalPages: 1,
    });

    renderCalendar();
    await waitFor(() => {
      expect(screen.getAllByText("Board briefing").length).toBeGreaterThan(0);
    });

    await user.click(screen.getByRole("button", { name: /^agenda$/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^agenda$/i })).toHaveAttribute(
        "aria-pressed",
        "true"
      );
    });
  });

  it("refetches when navigating periods", async () => {
    const user = userEvent.setup();
    const listSpy = vi.spyOn(calendarApi, "listCalendarEvents").mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 500,
      total: 0,
      totalPages: 1,
    });

    renderCalendar(`/calendar?date=${toDateKey(new Date())}`);
    await waitFor(() => expect(listSpy).toHaveBeenCalled());
    const firstCall = listSpy.mock.calls.length;

    await user.click(screen.getByRole("button", { name: /next period/i }));
    await waitFor(() => {
      expect(listSpy.mock.calls.length).toBeGreaterThan(firstCall);
    });
  });

  it("shows permission error on forbidden list", async () => {
    vi.spyOn(calendarApi, "listCalendarEvents").mockRejectedValue(
      new ApiClientError({
        message: "Forbidden",
        status: 403,
        code: "FORBIDDEN",
      })
    );

    renderCalendar();
    await waitFor(() => {
      expect(
        screen.getByText(/do not have permission to view the calendar/i)
      ).toBeInTheDocument();
    });
  });

  it("passes from/to range to the list API", async () => {
    const listSpy = vi.spyOn(calendarApi, "listCalendarEvents").mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 500,
      total: 0,
      totalPages: 1,
    });

    renderCalendar("/calendar?view=day&date=2026-09-15");
    await waitFor(() => expect(listSpy).toHaveBeenCalled());
    const params = listSpy.mock.calls[0]![0]!;
    expect(params.from).toBeDefined();
    expect(params.to).toBeDefined();
    expect(params.pageSize).toBe(500);
  });
});

describe("Calendar event details sheet actions", () => {
  it("shows edit and delete for standalone events", async () => {
    const event = makeEvent();
    vi.spyOn(calendarApi, "listCalendarEvents").mockResolvedValue({
      items: [event],
      page: 1,
      pageSize: 500,
      total: 1,
      totalPages: 1,
    });
    vi.spyOn(calendarApi, "getCalendarEvent").mockResolvedValue(event);

    renderCalendar(`/calendar?event=${event.id}`);

    await waitFor(() => {
      expect(screen.getByText("Standalone")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /^edit$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^delete$/i })).toBeInTheDocument();
  });
});
