import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { EmptyState } from "@/shared/components/empty-state";
import { Button } from "@/shared/components/ui/button";
import { PageHeader } from "@/shared/layout/page-header";
import { isApiClientError } from "@/shared/lib/http/errors";
import { CalendarAgenda } from "../components/calendar-agenda";
import { CalendarEventSheet } from "../components/calendar-event-sheet";
import type { CalendarEventSheetMode } from "../components/calendar-event-sheet";
import { CalendarMonthGrid } from "../components/calendar-month-grid";
import { CalendarToolbar } from "../components/calendar-toolbar";
import {
  CalendarDayView,
  CalendarWeekView,
} from "../components/calendar-week-day-views";
import { useCalendarEventsQuery } from "../hooks/use-calendar";
import {
  parseDateKey,
  rangeForView,
  shiftAnchor,
  startOfDay,
  toDateKey,
} from "../lib/date-utils";
import {
  CALENDAR_VIEWS,
  type CalendarEvent,
  type CalendarView,
} from "../types";

function isCalendarView(value: string | null): value is CalendarView {
  return Boolean(
    value && (CALENDAR_VIEWS as readonly string[]).includes(value)
  );
}

function defaultSlotRange(day: Date): { start: string; end: string } {
  const start = new Date(day);
  start.setHours(9, 0, 0, 0);
  const end = new Date(day);
  end.setHours(10, 0, 0, 0);
  return { start: start.toISOString(), end: end.toISOString() };
}

/**
 * Organisation calendar workspace — month/week/day/agenda with Sheet CRUD
 * for standalone events. Linked module events are read-only here.
 */
export function CalendarPage() {
  const [params, setParams] = useSearchParams();

  const rawView = params.get("view");
  const view: CalendarView = isCalendarView(rawView) ? rawView : "month";

  const dateParam = params.get("date");
  const anchor =
    (dateParam ? parseDateKey(dateParam) : null) ?? startOfDay(new Date());

  const createOpen = params.get("create") === "1";
  const eventId = params.get("event");
  const sheetModeParam = params.get("mode");
  const sheetMode: CalendarEventSheetMode = createOpen
    ? "create"
    : sheetModeParam === "edit"
      ? "edit"
      : "view";

  const slotStart = params.get("slotStart") ?? undefined;
  const slotEnd = params.get("slotEnd") ?? undefined;

  const range = useMemo(() => rangeForView(view, anchor), [view, anchor]);

  const listParams = useMemo(
    () => ({
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      page: 1,
      pageSize: 500,
      sort: "start" as const,
      sortDir: "asc" as const,
    }),
    [range.from, range.to]
  );

  const eventsQuery = useCalendarEventsQuery(listParams);
  const events = eventsQuery.data?.items ?? [];

  function patchParams(patch: Record<string, string | null>) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    }
    setParams(next, { replace: true });
  }

  function setView(next: CalendarView) {
    patchParams({ view: next });
  }

  function setAnchor(next: Date) {
    patchParams({ date: toDateKey(next) });
  }

  function openCreate(defaults?: { start: string; end: string }) {
    patchParams({
      create: "1",
      event: null,
      mode: null,
      slotStart: defaults?.start ?? null,
      slotEnd: defaults?.end ?? null,
    });
  }

  function openEvent(event: CalendarEvent) {
    patchParams({
      event: event.id,
      create: null,
      mode: "view",
      slotStart: null,
      slotEnd: null,
    });
  }

  function closeSheet() {
    patchParams({
      create: null,
      event: null,
      mode: null,
      slotStart: null,
      slotEnd: null,
    });
  }

  function handleSelectSlot(day: Date) {
    openCreate(defaultSlotRange(day));
  }

  const sheetOpen = createOpen || Boolean(eventId);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Calendar"
        description="Organisation schedule of standalone appointments and linked module dates."
        actions={
          <Button
            type="button"
            onClick={() =>
              openCreate(defaultSlotRange(startOfDay(new Date())))
            }
          >
            New event
          </Button>
        }
      />

      <CalendarToolbar
        view={view}
        anchor={anchor}
        onViewChange={setView}
        onToday={() => setAnchor(startOfDay(new Date()))}
        onPrev={() => setAnchor(shiftAnchor(view, anchor, -1))}
        onNext={() => setAnchor(shiftAnchor(view, anchor, 1))}
        onCreate={() => openCreate(defaultSlotRange(anchor))}
      />

      {eventsQuery.isLoading ? (
        <div
          className="rounded-lg border border-border bg-card p-8 text-sm text-muted-foreground"
          aria-busy="true"
        >
          Loading calendar events…
        </div>
      ) : eventsQuery.isError ? (
        <p className="ims-alert ims-alert-error" role="alert">
          {isApiClientError(eventsQuery.error) &&
          (eventsQuery.error.status === 403 ||
            eventsQuery.error.code === "FORBIDDEN")
            ? "You do not have permission to view the calendar."
            : "Unable to load calendar events. Try again."}
        </p>
      ) : (
        <>
          {view === "month" ? (
            <CalendarMonthGrid
              anchor={anchor}
              events={events}
              onSelectEvent={openEvent}
              onSelectSlot={handleSelectSlot}
            />
          ) : null}
          {view === "week" ? (
            <CalendarWeekView
              anchor={anchor}
              events={events}
              onSelectEvent={openEvent}
              onSelectSlot={handleSelectSlot}
            />
          ) : null}
          {view === "day" ? (
            <CalendarDayView
              anchor={anchor}
              events={events}
              onSelectEvent={openEvent}
              onSelectSlot={handleSelectSlot}
            />
          ) : null}
          {view === "agenda" ? (
            events.length === 0 ? (
              <EmptyState
                title="No events this week"
                description="Create a standalone event or wait for linked module dates to appear."
                action={
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => openCreate(defaultSlotRange(anchor))}
                  >
                    New event
                  </Button>
                }
              />
            ) : (
              <CalendarAgenda events={events} onSelectEvent={openEvent} />
            )
          ) : null}
        </>
      )}

      <CalendarEventSheet
        open={sheetOpen}
        mode={sheetMode}
        eventId={createOpen ? null : eventId}
        defaultStart={
          slotStart ??
          (createOpen ? defaultSlotRange(anchor).start : undefined)
        }
        defaultEnd={
          slotEnd ?? (createOpen ? defaultSlotRange(anchor).end : undefined)
        }
        onOpenChange={(open) => {
          if (!open) closeSheet();
        }}
        onModeChange={(mode) => {
          if (mode === "create") {
            openCreate();
            return;
          }
          patchParams({ mode, create: null });
        }}
        onCreated={closeSheet}
        onDeleted={closeSheet}
      />
    </div>
  );
}
