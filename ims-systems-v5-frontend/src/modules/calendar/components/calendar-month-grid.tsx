import { cn } from "@/shared/lib/utils";
import {
  buildMonthCells,
  isToday,
  sameDay,
  startOfMonth,
  toDateKey,
} from "../lib/date-utils";
import type { CalendarEvent } from "../types";
import { EventBlock } from "./event-block";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type CalendarMonthGridProps = {
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

export function CalendarMonthGrid({
  anchor,
  events,
  onSelectEvent,
  onSelectSlot,
}: CalendarMonthGridProps) {
  const cells = buildMonthCells(anchor);
  const month = startOfMonth(anchor);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="grid grid-cols-7 border-b border-border bg-muted/40">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 auto-rows-[minmax(6.5rem,1fr)]">
        {cells.map((day) => {
          const inMonth = day.getMonth() === month.getMonth();
          const dayEvents = eventsForDay(events, day);
          const visible = dayEvents.slice(0, 3);
          const overflow = dayEvents.length - visible.length;

          return (
            <button
              key={toDateKey(day)}
              type="button"
              className={cn(
                "flex min-h-[6.5rem] flex-col gap-1 border-b border-r border-border p-1.5 text-left align-top transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                !inMonth && "bg-muted/20 text-muted-foreground",
                isToday(day) && "bg-primary/5"
              )}
              onClick={() => onSelectSlot(day)}
              aria-label={`Create event on ${toDateKey(day)}`}
            >
              <span
                className={cn(
                  "inline-flex size-6 items-center justify-center rounded-full text-xs font-medium",
                  isToday(day) && "bg-primary text-primary-foreground",
                  !isToday(day) && sameDay(day, anchor) && "font-semibold"
                )}
              >
                {day.getDate()}
              </span>
              <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden">
                {visible.map((event) => (
                  <EventBlock
                    key={event.id}
                    event={event}
                    compact
                    onSelect={onSelectEvent}
                  />
                ))}
                {overflow > 0 ? (
                  <span className="px-1 text-[10px] text-muted-foreground">
                    +{overflow} more
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
