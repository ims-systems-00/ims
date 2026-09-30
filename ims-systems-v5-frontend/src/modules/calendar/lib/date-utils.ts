/**
 * Calendar date helpers — native Date / Intl only.
 * API boundary uses ISO-8601 strings; grids use local calendar days.
 */

import type { CalendarView } from "../types";

export function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function endOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

export function startOfWeek(date: Date): Date {
  const next = startOfDay(date);
  const day = next.getDay(); // 0 = Sunday
  next.setDate(next.getDate() - day);
  return next;
}

export function endOfWeek(date: Date): Date {
  return endOfDay(addDays(startOfWeek(date), 6));
}

export function startOfMonth(date: Date): Date {
  return startOfDay(new Date(date.getFullYear(), date.getMonth(), 1));
}

export function endOfMonth(date: Date): Date {
  return endOfDay(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

/** Visible range for API fetch (month grid includes adjacent week padding). */
export function rangeForView(
  view: CalendarView,
  anchor: Date
): { from: Date; to: Date } {
  if (view === "day") {
    return { from: startOfDay(anchor), to: endOfDay(anchor) };
  }
  if (view === "week" || view === "agenda") {
    return { from: startOfWeek(anchor), to: endOfWeek(anchor) };
  }
  const monthStart = startOfMonth(anchor);
  const monthEnd = endOfMonth(anchor);
  return {
    from: startOfWeek(monthStart),
    to: endOfWeek(monthEnd),
  };
}

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDateKey(key: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return null;
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3])
  );
  return Number.isNaN(date.getTime()) ? null : startOfDay(date);
}

export function formatMonthTitle(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatDayTitle(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatWeekTitle(date: Date): string {
  const from = startOfWeek(date);
  const to = endOfWeek(date);
  const fmt = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  });
  return `${fmt.format(from)} – ${fmt.format(to)}, ${to.getFullYear()}`;
}

export function formatEventTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatEventDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

/** datetime-local value in the user's local timezone. */
export function toDatetimeLocalValue(iso: string | Date): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Convert datetime-local string to ISO for API submission. */
export function fromDatetimeLocalValue(local: string): string {
  const date = new Date(local);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date/time");
  }
  return date.toISOString();
}

export function sameDay(a: Date, b: Date): boolean {
  return toDateKey(a) === toDateKey(b);
}

export function isToday(date: Date): boolean {
  return sameDay(date, new Date());
}

export function buildMonthCells(anchor: Date): Date[] {
  const { from, to } = rangeForView("month", anchor);
  const cells: Date[] = [];
  let cursor = new Date(from);
  while (cursor.getTime() <= to.getTime()) {
    cells.push(new Date(cursor));
    cursor = addDays(cursor, 1);
  }
  return cells;
}

export function buildWeekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function shiftAnchor(
  view: CalendarView,
  anchor: Date,
  direction: -1 | 1
): Date {
  if (view === "month") return addMonths(anchor, direction);
  if (view === "day") return addDays(anchor, direction);
  return addDays(anchor, direction * 7);
}
