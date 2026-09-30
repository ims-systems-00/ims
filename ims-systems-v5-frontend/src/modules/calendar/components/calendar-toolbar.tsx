import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import {
  formatDayTitle,
  formatMonthTitle,
  formatWeekTitle,
} from "../lib/date-utils";
import type { CalendarView } from "../types";

const VIEWS: { id: CalendarView; label: string }[] = [
  { id: "month", label: "Month" },
  { id: "week", label: "Week" },
  { id: "day", label: "Day" },
  { id: "agenda", label: "Agenda" },
];

type CalendarToolbarProps = {
  view: CalendarView;
  anchor: Date;
  onViewChange: (view: CalendarView) => void;
  onToday: () => void;
  onPrev: () => void;
  onNext: () => void;
  onCreate: () => void;
};

function titleFor(view: CalendarView, anchor: Date): string {
  if (view === "month") return formatMonthTitle(anchor);
  if (view === "day") return formatDayTitle(anchor);
  return formatWeekTitle(anchor);
}

export function CalendarToolbar({
  view,
  anchor,
  onViewChange,
  onToday,
  onPrev,
  onNext,
  onCreate,
}: CalendarToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onToday}>
          Today
        </Button>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onPrev}
            aria-label="Previous period"
          >
            ‹
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onNext}
            aria-label="Next period"
          >
            ›
          </Button>
        </div>
        <h2 className="ims-text-section px-1">{titleFor(view, anchor)}</h2>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div
          className="inline-flex rounded-md border border-border bg-background p-0.5"
          role="group"
          aria-label="Calendar view"
        >
          {VIEWS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={cn(
                "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                view === item.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-pressed={view === item.id}
              onClick={() => onViewChange(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <Button type="button" size="sm" onClick={onCreate}>
          New event
        </Button>
      </div>
    </div>
  );
}
