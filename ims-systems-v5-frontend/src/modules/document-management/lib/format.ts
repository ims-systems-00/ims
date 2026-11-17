import { formatDate, formatDateLong, parseDisplayDate } from "@/shared/lib/format-date";
import type { DocumentReviewInterval } from "../types";

export function formatDocumentDate(
  value: string | Date | null | undefined
): string {
  return formatDate(value);
}

/** Short numeric date (dd-mm-yyyy) for upload captions. */
export function formatDocumentDateShort(
  value: string | Date | null | undefined
): string {
  return formatDate(value);
}

/** Side-panel dates — `12 January 2027`. */
export function formatDocumentDateLong(
  value: string | Date | null | undefined
): string {
  return formatDateLong(value);
}

/** Review-date cells: long form, or "Not set" when empty. */
export function formatReviewDateDisplay(
  value: string | Date | null | undefined
): string {
  if (!value) return "Not set";
  const formatted = formatDateLong(value);
  return formatted === "—" ? "Not set" : formatted;
}

/** Native `<input type="date">` value (`yyyy-mm-dd`) from an ISO/date string. */
export function toDateInputValue(value: string | null | undefined): string {
  const date = parseDisplayDate(value);
  if (!date) return "";
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** Parse native date-input `yyyy-mm-dd` (also accepts dd/mm/yyyy) to ISO midnight UTC. */
export function fromDateInputValue(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      return null;
    }
    return date.toISOString();
  }

  const uk = /^(\d{1,2})[\/\-\s](\d{1,2})[\/\-\s](\d{4})$/.exec(trimmed);
  if (uk) {
    const day = Number(uk[1]);
    const month = Number(uk[2]);
    const year = Number(uk[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const date = new Date(Date.UTC(year, month - 1, day));
    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      return null;
    }
    return date.toISOString();
  }

  return null;
}

/**
 * Next repository review date from createdOn + interval.
 * Matches V4: keep advancing by the interval until the date is after today.
 */
export function computeRepoReviewDate(
  createdOn: string,
  interval: DocumentReviewInterval
): Date | null {
  if (!createdOn || !interval) return null;
  const date = new Date(createdOn);
  if (Number.isNaN(date.getTime())) return null;

  function addInterval() {
    if (interval === "Quarterly") date.setMonth(date.getMonth() + 3);
    else if (interval === "Half yearly") date.setMonth(date.getMonth() + 6);
    else date.setFullYear(date.getFullYear() + 1);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  do {
    addInterval();
  } while (date <= today);

  return date;
}
