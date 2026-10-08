import { useMemo, useState } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { StatusBadge } from "@/shared/components/status-badge";
import { cn } from "@/shared/lib/utils";
import type {
  BusinessUnitMaturity,
  DigitalMaturityStats,
  ModuleMaturity,
} from "../types";
import { CHART_AXIS_TICK, CHART_GRID_STROKE } from "../lib/chart-theme";
import { DashboardEmptyState } from "./dashboard-panel";

const MAX_MODULE_SCORE = 4;
const MAX_ORG_SCORE = 28;

function maturityTone(
  score: ModuleMaturity["score"]
): "destructive" | "warning" | "info" | "success" {
  if (score <= 1) return "destructive";
  if (score === 2) return "warning";
  if (score === 3) return "info";
  return "success";
}

function scoreFill(score: ModuleMaturity["score"]): string {
  switch (score) {
    case 1:
      return "var(--destructive)";
    case 2:
      return "var(--warning)";
    case 3:
      return "var(--info)";
    case 4:
      return "var(--success)";
  }
}

function totalScore(modules: ModuleMaturity[]): number {
  return modules.reduce((sum, mod) => sum + mod.score, 0);
}

function unitAverageScore(unit: BusinessUnitMaturity): number {
  if (unit.modules.length === 0) return 0;
  return totalScore(unit.modules) / unit.modules.length;
}

type DigitalMaturityPanelContentProps = {
  data: DigitalMaturityStats;
};

/**
 * Digital maturity: organisation score + radar, then per-unit module detail.
 */
export function DigitalMaturityPanelContent({
  data,
}: DigitalMaturityPanelContentProps) {
  const units = data.businessUnitMaturity;
  const orgModules =
    data.organisationalMaturity.length > 0
      ? data.organisationalMaturity
      : units[0]?.modules.map((mod) => ({
          ...mod,
          score: 1 as ModuleMaturity["score"],
          utilisationPercentage: 0,
        })) ?? [];

  const [selectedUnitId, setSelectedUnitId] = useState(
    () => units[0]?.functionalUnitId ?? ""
  );

  const selectedUnit =
    units.find((unit) => unit.functionalUnitId === selectedUnitId) ?? units[0];

  const orgTotal = useMemo(() => totalScore(orgModules), [orgModules]);
  const orgPct = Math.round((orgTotal / MAX_ORG_SCORE) * 100);

  const radarData = useMemo(
    () =>
      orgModules.map((mod) => ({
        module: mod.label,
        score: mod.score,
        fullMark: MAX_MODULE_SCORE,
      })),
    [orgModules]
  );

  if (units.length === 0) {
    return (
      <DashboardEmptyState
        title="No internal business units"
        description="Digital maturity is calculated for internal business functions only."
      />
    );
  }

  const ringRadius = 54;
  const circumference = 2 * Math.PI * ringRadius;
  const dashOffset = circumference * (1 - Math.min(1, orgTotal / MAX_ORG_SCORE));

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,9.5rem)_minmax(0,1fr)] sm:items-center">
        <div
          className="relative mx-auto flex size-[8.25rem] items-center justify-center"
          aria-label={`Organisation maturity score ${orgTotal} of ${MAX_ORG_SCORE}`}
        >
          <svg
            viewBox="0 0 128 128"
            className="absolute inset-0 size-full -rotate-90"
            aria-hidden
          >
            <circle
              cx="64"
              cy="64"
              r={ringRadius}
              fill="none"
              stroke="var(--surface-muted)"
              strokeWidth="8"
            />
            <circle
              cx="64"
              cy="64"
              r={ringRadius}
              fill="none"
              stroke="var(--primary)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              className="transition-[stroke-dashoffset] duration-700 ease-out"
            />
          </svg>
          <div className="relative text-center">
            <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
              {orgTotal}
              <span className="text-sm font-medium text-muted-foreground">
                /{MAX_ORG_SCORE}
              </span>
            </p>
            <p className="mt-0.5 text-[0.625rem] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Org score
            </p>
          </div>
        </div>

        <div className="min-h-[11rem] min-w-0">
          <div className="mb-1.5 flex items-baseline justify-between gap-2">
            <p className="text-[0.6875rem] font-medium uppercase tracking-[0.07em] text-muted-foreground">
              Organisation profile
            </p>
            <p className="text-[0.6875rem] tabular-nums text-muted-foreground">
              {orgPct}% of max maturity
            </p>
          </div>
          <div
            className="h-[10rem] w-full"
            role="img"
            aria-label="Organisation digital maturity radar by module"
          >
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="72%">
                <PolarGrid stroke={CHART_GRID_STROKE} />
                <PolarAngleAxis
                  dataKey="module"
                  tick={{ ...CHART_AXIS_TICK, fontSize: 10 }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, MAX_MODULE_SCORE]}
                  tick={false}
                  axisLine={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const point = payload[0]?.payload as {
                      module?: string;
                      score?: number;
                    };
                    return (
                      <div className="rounded-md border border-border bg-surface-elevated px-2.5 py-1.5 text-[0.6875rem] shadow-md">
                        <p className="font-medium text-foreground">
                          {point.module}
                        </p>
                        <p className="tabular-nums text-muted-foreground">
                          Level {point.score} / {MAX_MODULE_SCORE}
                        </p>
                      </div>
                    );
                  }}
                />
                <Radar
                  name="Maturity"
                  dataKey="score"
                  stroke="var(--primary)"
                  fill="var(--primary)"
                  fillOpacity={0.18}
                  strokeWidth={1.75}
                  isAnimationActive={false}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="space-y-3 border-t border-border-subtle pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[0.6875rem] font-medium uppercase tracking-[0.07em] text-muted-foreground">
            By business unit
          </p>
          {selectedUnit ? (
            <p className="text-[0.6875rem] tabular-nums text-muted-foreground">
              Avg level {unitAverageScore(selectedUnit).toFixed(1)} ·{" "}
              {totalScore(selectedUnit.modules)}/{MAX_ORG_SCORE}
            </p>
          ) : null}
        </div>

        <div
          className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Business units"
        >
          {units.map((unit) => {
            const selected = unit.functionalUnitId === selectedUnit?.functionalUnitId;
            const unitTotal = totalScore(unit.modules);
            return (
              <button
                key={unit.functionalUnitId}
                type="button"
                aria-pressed={selected}
                onClick={() => setSelectedUnitId(unit.functionalUnitId)}
                className={cn(
                  "shrink-0 rounded-md border px-2.5 py-1.5 text-left transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                  selected
                    ? "border-primary/35 bg-primary/[0.06] text-foreground"
                    : "border-border-subtle bg-surface-muted/40 text-muted-foreground hover:bg-surface-muted/70 hover:text-foreground"
                )}
              >
                <span className="block max-w-[10rem] truncate text-[0.75rem] font-medium">
                  {unit.name}
                </span>
                <span className="mt-0.5 block text-[0.625rem] tabular-nums opacity-80">
                  {unitTotal}/{MAX_ORG_SCORE}
                </span>
              </button>
            );
          })}
        </div>

        {selectedUnit ? (
          <ul
            className="space-y-2.5"
            aria-label={`Digital maturity for ${selectedUnit.name}`}
          >
            {selectedUnit.modules.map((mod) => (
              <li
                key={mod.key}
                className="rounded-md border border-border-subtle/80 bg-surface-muted/25 px-2.5 py-2"
              >
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="truncate text-[0.8125rem] font-medium text-foreground">
                    {mod.label}
                  </span>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusBadge tone={maturityTone(mod.score)}>
                      L{mod.score}
                    </StatusBadge>
                    <span className="text-[0.6875rem] tabular-nums text-muted-foreground">
                      {mod.utilisationPercentage}%
                    </span>
                  </div>
                </div>
                <div
                  className="h-1.5 overflow-hidden rounded-sm bg-surface-muted"
                  role="presentation"
                >
                  <div
                    className="h-full rounded-sm transition-[width] duration-500 ease-out"
                    style={{
                      width: `${Math.min(100, mod.utilisationPercentage)}%`,
                      background: `color-mix(in oklch, ${scoreFill(mod.score)} 72%, transparent)`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
