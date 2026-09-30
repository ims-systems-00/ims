import { cn } from "@/shared/lib/utils";
import { formatInteger } from "../lib/format";

type BarItem = {
  label: string;
  value: number;
  hint?: string;
};

type DashboardBarListProps = {
  items: BarItem[];
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
  /** Accessible name for the chart region. */
  ariaLabel: string;
};

/**
 * Simple horizontal bar list — no chart library dependency.
 */
export function DashboardBarList({
  items,
  emptyTitle = "No data",
  emptyDescription,
  className,
  ariaLabel,
}: DashboardBarListProps) {
  const max = Math.max(0, ...items.map((item) => item.value));

  if (items.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        {emptyTitle}
        {emptyDescription ? (
          <span className="mt-1 block text-xs">{emptyDescription}</span>
        ) : null}
      </p>
    );
  }

  return (
    <ul className={cn("space-y-2.5", className)} aria-label={ariaLabel}>
      {items.map((item) => {
        const pct = max > 0 ? Math.round((item.value / max) * 100) : 0;
        return (
          <li key={item.label} className="space-y-1">
            <div className="flex items-baseline justify-between gap-2 text-[0.75rem]">
              <span className="truncate font-medium text-foreground">
                {item.label}
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {formatInteger(item.value)}
                {item.hint ? ` · ${item.hint}` : ""}
              </span>
            </div>
            <div
              className="h-1.5 overflow-hidden rounded-sm bg-surface-muted"
              role="presentation"
            >
              <div
                className="h-full rounded-sm bg-primary/70"
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

type SeriesChartProps = {
  months: string[];
  series: Record<string, number[]>;
  ariaLabel: string;
  className?: string;
};

/**
 * Compact multi-series month chart using CSS columns (no chart library).
 */
export function DashboardSeriesChart({
  months,
  series,
  ariaLabel,
  className,
}: SeriesChartProps) {
  const keys = Object.keys(series);
  const allValues = keys.flatMap((key) => series[key] ?? []);
  const max = Math.max(1, ...allValues);

  if (months.length === 0 || keys.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        No series data for this period.
      </p>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div
        className="flex h-28 items-end gap-1 overflow-x-auto pb-1"
        role="img"
        aria-label={ariaLabel}
      >
        {months.map((month, index) => (
          <div
            key={`${month}-${index}`}
            className="flex min-w-[2rem] flex-1 flex-col items-center gap-1"
          >
            <div className="flex h-24 w-full items-end justify-center gap-px">
              {keys.map((key) => {
                const value = series[key]?.[index] ?? 0;
                const height = Math.max(2, Math.round((value / max) * 96));
                return (
                  <div
                    key={key}
                    title={`${key}: ${value} (${month})`}
                    className="w-full max-w-[6px] rounded-t-sm bg-primary/55"
                    style={{ height }}
                  />
                );
              })}
            </div>
            <span className="text-[0.625rem] text-muted-foreground">
              {month}
            </span>
          </div>
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[0.6875rem] text-muted-foreground">
        {keys.map((key) => (
          <li key={key} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block size-1.5 rounded-sm bg-primary/55"
              aria-hidden
            />
            {key}
          </li>
        ))}
      </ul>
    </div>
  );
}
