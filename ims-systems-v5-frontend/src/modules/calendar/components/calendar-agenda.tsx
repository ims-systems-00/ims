import {
  formatEventDateTime,
  formatEventTime,
  toDateKey,
} from "../lib/date-utils";
import {
  EVENT_REFERENCE_LABELS,
  isLinkedEvent,
  type CalendarEvent,
} from "../types";
import { eventColorDotClass } from "./event-colors";

type CalendarAgendaProps = {
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
};

export function CalendarAgenda({ events, onSelectEvent }: CalendarAgendaProps) {
  const sorted = [...events].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  );

  if (sorted.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
        No events in this period.
      </div>
    );
  }

  let lastKey = "";

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <ul className="divide-y divide-border">
        {sorted.map((event) => {
          const key = toDateKey(new Date(event.start));
          const showHeading = key !== lastKey;
          lastKey = key;
          return (
            <li key={event.id}>
              {showHeading ? (
                <div className="bg-muted/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {new Date(event.start).toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  })}
                </div>
              ) : null}
              <button
                type="button"
                className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                onClick={() => onSelectEvent(event)}
              >
                <span
                  className={`mt-1.5 size-2.5 shrink-0 rounded-full ${eventColorDotClass[event.color]}`}
                  aria-hidden
                />
                <span className="w-28 shrink-0 text-xs tabular-nums text-muted-foreground">
                  {formatEventTime(event.start)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground">
                    {event.title}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {formatEventDateTime(event.start)}
                    {isLinkedEvent(event) && event.eventReference
                      ? ` · ${EVENT_REFERENCE_LABELS[event.eventReference]}`
                      : ""}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
