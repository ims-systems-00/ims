import { useId, useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/shared/lib/utils";
import { formatCurrency, formatInteger } from "../lib/format";
import {
  CHART_AXIS_STROKE,
  CHART_AXIS_TICK,
  CHART_GRID_STROKE,
  seriesColor,
} from "../lib/chart-theme";

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
  ariaLabel: string;
  /** Currency formatting for values (CRM / inventory). */
  valueFormat?: "integer" | "currency";
};

type TooltipEntry = {
  name?: string | number;
  value?: number | string;
  color?: string;
};

function ChartTooltipContent({
  active,
  label,
  payload,
  valueFormat = "integer",
}: {
  active?: boolean;
  label?: string | number;
  payload?: TooltipEntry[];
  valueFormat?: "integer" | "currency";
}) {
  if (!active || !payload?.length) return null;

  const formatValue = (value: number | string | undefined) => {
    if (typeof value !== "number") return String(value ?? "—");
    return valueFormat === "currency"
      ? formatCurrency(value)
      : formatInteger(value);
  };

  return (
    <div className="rounded-md border border-border bg-surface-elevated px-3 py-2 shadow-md">
      {label != null ? (
        <p className="mb-1.5 text-[0.6875rem] font-medium text-foreground">
          {label}
        </p>
      ) : null}
      <ul className="space-y-1">
        {payload.map((entry) => (
          <li
            key={String(entry.name)}
            className="flex items-center gap-2 text-[0.6875rem] text-muted-foreground"
          >
            <span
              className="size-1.5 shrink-0 rounded-sm"
              style={{ background: entry.color }}
              aria-hidden
            />
            <span className="truncate">{entry.name}</span>
            <span className="ml-auto tabular-nums font-medium text-foreground">
              {formatValue(entry.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Ranked horizontal bars — compact, readable for top-N lists.
 */
export function DashboardBarList({
  items,
  emptyTitle = "No data",
  emptyDescription,
  className,
  ariaLabel,
  valueFormat = "integer",
}: DashboardBarListProps) {
  const max = Math.max(0, ...items.map((item) => item.value));

  if (items.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        {emptyTitle}
        {emptyDescription ? (
          <span className="mt-1 block text-xs">{emptyDescription}</span>
        ) : null}
      </p>
    );
  }

  return (
    <ul className={cn("space-y-3", className)} aria-label={ariaLabel}>
      {items.map((item, index) => {
        const pct = max > 0 ? Math.round((item.value / max) * 100) : 0;
        const display =
          valueFormat === "currency"
            ? formatCurrency(item.value)
            : formatInteger(item.value);
        return (
          <li key={item.label} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2 text-[0.75rem]">
              <span className="flex min-w-0 items-baseline gap-1.5 font-medium text-foreground">
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="truncate">{item.label}</span>
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {display}
                {item.hint ? ` · ${item.hint}` : ""}
              </span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-sm bg-surface-muted"
              role="presentation"
            >
              <div
                className="h-full rounded-sm transition-[width] duration-500 ease-out"
                style={{
                  width: `${pct}%`,
                  background: `color-mix(in oklch, ${seriesColor(0)} ${55 + Math.min(35, pct / 3)}%, transparent)`,
                }}
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
  height?: number;
};

/**
 * Multi-series monthly trend — Recharts AreaChart, frontend-agnostic data in.
 */
export function DashboardSeriesChart({
  months,
  series,
  ariaLabel,
  className,
  height = 240,
}: SeriesChartProps) {
  const gradientId = useId().replace(/:/g, "");
  const keys = useMemo(() => Object.keys(series), [series]);

  const data = useMemo(
    () =>
      months.map((month, index) => {
        const row: Record<string, string | number> = { month };
        for (const key of keys) {
          row[key] = series[key]?.[index] ?? 0;
        }
        return row;
      }),
    [months, series, keys]
  );

  if (months.length === 0 || keys.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No series data for this period.
      </p>
    );
  }

  return (
    <div
      className={cn("w-full", className)}
      style={{ height }}
      role="img"
      aria-label={ariaLabel}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <defs>
            {keys.map((key, index) => (
              <linearGradient
                key={key}
                id={`${gradientId}-${index}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor={seriesColor(index)}
                  stopOpacity={0.28}
                />
                <stop
                  offset="100%"
                  stopColor={seriesColor(index)}
                  stopOpacity={0.02}
                />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid
            stroke={CHART_GRID_STROKE}
            strokeDasharray="3 6"
            vertical={false}
          />
          <XAxis
            dataKey="month"
            tick={CHART_AXIS_TICK}
            axisLine={{ stroke: CHART_AXIS_STROKE }}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={16}
          />
          <YAxis
            tick={CHART_AXIS_TICK}
            axisLine={false}
            tickLine={false}
            width={36}
            allowDecimals={false}
          />
          <Tooltip
            content={<ChartTooltipContent />}
            cursor={{
              stroke: "var(--border)",
              strokeWidth: 1,
              strokeDasharray: "4 4",
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={28}
            iconType="circle"
            iconSize={7}
            wrapperStyle={{
              fontSize: 11,
              color: "var(--muted-foreground)",
              paddingTop: 8,
            }}
          />
          {keys.map((key, index) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              name={key}
              stroke={seriesColor(index)}
              strokeWidth={2}
              fill={`url(#${gradientId}-${index})`}
              dot={false}
              activeDot={{ r: 3.5, strokeWidth: 0 }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

type CategoryBarChartProps = {
  items: BarItem[];
  ariaLabel: string;
  className?: string;
  height?: number;
  emptyTitle?: string;
  valueFormat?: "integer" | "currency";
};

/**
 * Category comparison bar chart for distribution panels.
 */
export function DashboardCategoryBarChart({
  items,
  ariaLabel,
  className,
  height = 220,
  emptyTitle = "No data",
  valueFormat = "integer",
}: CategoryBarChartProps) {
  const data = useMemo(
    () =>
      items.map((item) => ({
        name: item.label,
        value: item.value,
      })),
    [items]
  );

  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {emptyTitle}
      </p>
    );
  }

  return (
    <div
      className={cn("w-full", className)}
      style={{ height }}
      role="img"
      aria-label={ariaLabel}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
        >
          <CartesianGrid
            stroke={CHART_GRID_STROKE}
            strokeDasharray="3 6"
            horizontal={false}
          />
          <XAxis
            type="number"
            tick={CHART_AXIS_TICK}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={96}
            tick={CHART_AXIS_TICK}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "var(--surface-muted)" }}
            content={<ChartTooltipContent valueFormat={valueFormat} />}
          />
          <Bar dataKey="value" name="Value" radius={[0, 3, 3, 0]} barSize={14}>
            {data.map((_, index) => (
              <Cell key={index} fill={seriesColor(index)} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

type DonutSlice = {
  label: string;
  value: number;
};

type DonutChartProps = {
  slices: DonutSlice[];
  ariaLabel: string;
  className?: string;
  centerLabel?: string;
  centerValue?: string;
  height?: number;
};

/**
 * Compact donut for part-to-whole KPIs (e.g. audit status mix).
 */
export function DashboardDonutChart({
  slices,
  ariaLabel,
  className,
  centerLabel,
  centerValue,
  height = 180,
}: DonutChartProps) {
  const data = slices.filter((slice) => slice.value > 0);
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  if (total === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No values to chart.
      </p>
    );
  }

  return (
    <div
      className={cn("relative w-full", className)}
      style={{ height }}
      role="img"
      aria-label={ariaLabel}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius="62%"
            outerRadius="82%"
            paddingAngle={2}
            stroke="var(--surface)"
            strokeWidth={2}
          >
            {data.map((_, index) => (
              <Cell key={index} fill={seriesColor(index)} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltipContent />} />
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            iconSize={7}
            wrapperStyle={{
              fontSize: 11,
              color: "var(--muted-foreground)",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      {centerValue ? (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-6">
          <p className="text-xl font-semibold tabular-nums tracking-tight text-foreground">
            {centerValue}
          </p>
          {centerLabel ? (
            <p className="text-[0.6875rem] text-muted-foreground">
              {centerLabel}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
