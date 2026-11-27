/**
 * Date helpers for live compliance rules. All dates are ISO `YYYY-MM-DD`
 * evaluated in UTC so results are deterministic and testable.
 */

const DAY_MS = 86_400_000;

function dayNumber(iso: string): number {
  return Math.floor(Date.parse(`${iso.slice(0, 10)}T00:00:00Z`) / DAY_MS);
}

export function isoDay(value: Date | string = new Date()): string {
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

/** Whole days from `today` until `date` (negative when in the past). */
export function daysUntil(date: string, today: string): number {
  return dayNumber(date) - dayNumber(today);
}

export function addMonthsIso(date: string, months: number): string {
  const d = new Date(`${date.slice(0, 10)}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return isoDay(d);
}

export function addDaysIso(date: string, days: number): string {
  return isoDay(new Date((dayNumber(date) + days) * DAY_MS));
}

/** "29 Nov 2026" */
export function formatDay(date: string): string {
  return new Date(`${date.slice(0, 10)}T00:00:00Z`).toLocaleDateString(
    "en-GB",
    { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }
  );
}

export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}
