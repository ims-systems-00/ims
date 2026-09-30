import { cn } from "@/shared/lib/utils";
import {
  buildWeekDays,
  formatEventTime,
  isToday,
  toDateKey,
} from "../lib/date-utils";
import type { CalendarEvent } from "../types";
import { EventBlock } from "./event-block";

type CalendarWeekViewProps = {
  anchor: Date;
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
  onSelectSlot: (day: Date) => void;
};

function eventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(day);
  dayEnd.setHours(23, 59, 59, 999);
  return events
    .filter((event) => {
      const start = new Date(event.start);
      const end = new Date(event.end);
      return (
        start.getTime() <= dayEnd.getTime() && end.getTime() >= dayStart.getTime()
      );
    })
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}

export function CalendarWeekView({
  anchor,
  events,
  onSelectEvent,
  onSelectSlot,
}: CalendarWeekViewProps) {
  const days = buildWeekDays(anchor);

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <div className="grid min-w-[44rem] grid-cols-7">
        {days.map((day) => {
          const dayEvents = eventsForDay(events, day);
          return (
            <div
              key={toDateKey(day)}
              className={cn(
                "min-h-[18rem] border-r border-border last:border-r-0",
                isToday(day) && "bg-primary/5"
              )}
            >
              <button
                type="button"
                className="flex w-full items-center justify-between border-b border-border px-2 py-2 text-left hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                onClick={() => onSelectSlot(day)}
                aria-label={`Create event on ${toDateKey(day)}`}
              >
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {day.toLocaleDateString(undefined, { weekday: "short" })}
                </span>
                <span
                  className={cn(
                    "inline-flex size-6 items-center justify-center rounded-full text-xs font-medium",
                    isToday(day) && "bg-primary text-primary-foreground"
                  )}
                >
                  {day.getDate()}
                </span>
              </button>
              <div className="flex flex-col gap-1 p-1.5">
                {dayEvents.length === 0 ? (
                  <p className="px-1 py-2 text-[11px] text-muted-foreground">
                    No events
                  </p>
                ) : (
                  dayEvents.map((event) => (
                    <EventBlock
                      key={event.id}
                      event={event}
                      onSelect={onSelectEvent}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type CalendarDayViewProps = {
  anchor: Date;
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
  onSelectSlot: (day: Date) => void;
};

export function CalendarDayView({
  anchor,
  events,
  onSelectEvent,
  onSelectSlot,
}: CalendarDayViewProps) {
  const dayEvents = eventsForDay(events, anchor);

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="text-sm text-muted-foreground">
          {dayEvents.length} event{dayEvents.length === 1 ? "" : "s"}
        </p>
        <button
          type="button"
          className="text-sm font-medium text-primary underline-offset-2 hover:underline"
          onClick={() => onSelectSlot(anchor)}
        >
          Add event
        </button>
      </div>
      <ul className="divide-y divide-border">
        {dayEvents.length === 0 ? (
          <li className="px-4 py-10 text-center text-sm text-muted-foreground">
            No events on this day.
          </li>
        ) : (
          dayEvents.map((event) => (
            <li key={event.id}>
              <button
                type="button"
                className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                onClick={() => onSelectEvent(event)}
              >
                <span className="w-24 shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                  {formatEventTime(event.start)}
                  {event.start !== event.end
                    ? ` – ${formatEventTime(event.end)}`
                    : ""}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">
                    {event.title}
                  </span>
                  {event.description ? (
                    <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">
                      {event.description}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
