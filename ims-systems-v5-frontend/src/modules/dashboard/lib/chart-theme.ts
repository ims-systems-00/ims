/**
 * Corporate chart palette aligned to V5 semantic tokens.
 * Intentionally restrained — slate/ink + muted status accents.
 */

export const CHART_SERIES_COLORS = [
  "var(--info)",
  "var(--success)",
  "var(--warning)",
  "var(--destructive)",
  "oklch(0.42 0.04 255)",
  "oklch(0.55 0.03 220)",
  "oklch(0.48 0.06 200)",
  "oklch(0.58 0.05 145)",
] as const;

export const CHART_AXIS_TICK = {
  fill: "var(--muted-foreground)",
  fontSize: 11,
  fontFamily: "inherit",
} as const;

export const CHART_GRID_STROKE = "var(--border-subtle)";
export const CHART_AXIS_STROKE = "var(--border)";

export function seriesColor(index: number): string {
  return CHART_SERIES_COLORS[index % CHART_SERIES_COLORS.length]!;
}
