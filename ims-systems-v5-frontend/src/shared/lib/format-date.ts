/**
 * Standard UK date display for V5 UI: dd-mm-yyyy.
 */

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Parse ISO timestamps and date-only `YYYY-MM-DD` without timezone drift
 * on calendar dates (date-only → local calendar day).
 */
export function parseDisplayDate(
  value: string | Date | null | undefined
): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const trimmed = value.trim();
  const dateOnly = DATE_ONLY.exec(trimmed);
  if (dateOnly) {
    const year = Number(dateOnly[1]);
    const month = Number(dateOnly[2]);
    const day = Number(dateOnly[3]);
    const date = new Date(year, month - 1, day);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Date only — `23-10-2026`. */
export function formatDate(
  value: string | Date | null | undefined,
  empty = "—"
): string {
  const date = parseDisplayDate(value);
  if (!date) return empty;
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}`;
}

/** Date + time — `23-10-2026 14:05`. */
export function formatDateTime(
  value: string | Date | null | undefined,
  empty = "—"
): string {
  const date = parseDisplayDate(value);
  if (!date) return empty;
  return `${formatDate(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Time only — `14:05` (24h). */
export function formatTime(
  value: string | Date | null | undefined,
  empty = "—"
): string {
  const date = parseDisplayDate(value);
  if (!date) return empty;
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
