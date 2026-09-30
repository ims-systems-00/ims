/**
 * Stats date-range helpers (V4 manager.getDefaultDateRange semantics).
 */

import type { ResolvedDateRange, StatsDateQuery } from "../types";

const MONTH_LABELS = [
  "",
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
] as const;

/**
 * V4 default when query omitted: 2022-01-01 → 2027-01-01.
 * Spec documents this fixed window (frontend never sends dates).
 */
export function resolveStatsDateRange(
  query: StatsDateQuery = {}
): ResolvedDateRange {
  const startDate = query.startDate
    ? new Date(query.startDate)
    : new Date(2022, 0, 1);
  const endDate = query.endDate
    ? new Date(query.endDate)
    : new Date(2027, 0, 1);
  return { startDate, endDate };
}

/** Risk stats V4: endDate defaults to today when resolving month buckets. */
export function resolveRiskStatsWindow(months: number): {
  startDate: Date;
  endDate: Date;
  monthMeta: Array<{ year: number; month: number; label: string }>;
} {
  const endDate = new Date();
  const monthMeta: Array<{ year: number; month: number; label: string }> = [];
  const cursor = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
  cursor.setMonth(cursor.getMonth() - (months - 1));
  for (let i = 0; i < months; i += 1) {
    monthMeta.push({
      year: cursor.getFullYear(),
      month: cursor.getMonth() + 1,
      label: MONTH_LABELS[cursor.getMonth() + 1]!,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  const startDate = new Date(
    monthMeta[0]!.year,
    monthMeta[0]!.month - 1,
    1
  );
  return { startDate, endDate, monthMeta };
}

export function last12InvoiceMonths(now = new Date()): Array<{
  year: number;
  month: number;
  label: string;
}> {
  const result: Array<{ year: number; month: number; label: string }> = [];
  const cursor = new Date(now.getFullYear(), now.getMonth(), 1);
  cursor.setMonth(cursor.getMonth() - 11);
  for (let i = 0; i < 12; i += 1) {
    result.push({
      year: cursor.getFullYear(),
      month: cursor.getMonth() + 1,
      label: MONTH_LABELS[cursor.getMonth() + 1]!,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return result;
}
