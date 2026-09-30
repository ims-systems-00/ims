import { cn } from "@/shared/lib/utils";
import { formatEventTime } from "../lib/date-utils";
import type { CalendarEvent } from "../types";
import { eventColorClass } from "./event-colors";

type EventBlockProps = {
  event: CalendarEvent;
  compact?: boolean;
  onSelect: (event: CalendarEvent) => void;
};

export function EventBlock({ event, compact = false, onSelect }: EventBlockProps) {
  return (
    <button
      type="button"
      className={cn(
        "w-full truncate rounded border px-1.5 text-left text-[11px] leading-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        compact ? "py-0.5" : "py-1 text-xs",
        eventColorClass[event.color]
      )}
      title={`${event.title} · ${formatEventTime(event.start)}`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(event);
      }}
    >
      {!compact ? (
        <span className="mr-1 font-medium tabular-nums opacity-80">
          {formatEventTime(event.start)}
        </span>
      ) : null}
      <span className="font-medium">{event.title}</span>
    </button>
  );
}
