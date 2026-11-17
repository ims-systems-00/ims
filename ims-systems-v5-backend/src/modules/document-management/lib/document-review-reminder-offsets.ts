/**
 * Document / folder / repository review reminder offset helpers.
 * Mirrors V4 constants/documentReviewReminders.js with repo anniversary support.
 */

import type { DocumentReviewInterval } from "../types";

export const DOCUMENT_REVIEW_ON_DAY_OFFSET = {
  value: "on_day",
  label: "on the review date",
  days: 0,
} as const;

export const DOCUMENT_REVIEW_REMINDER_OFFSET_DEFS = [
  { value: "3_months", label: "3 Months", months: 3 },
  { value: "2_months", label: "2 Months", months: 2 },
  { value: "1_month", label: "1 Month", months: 1 },
  { value: "3_weeks", label: "3 Weeks", days: 21 },
  { value: "2_weeks", label: "2 Weeks", days: 14 },
  { value: "1_week", label: "1 Week", days: 7 },
  { value: "5_days", label: "5 Days", days: 5 },
  { value: "1_day", label: "1 Day", days: 1 },
] as const;

export type DocumentReviewReminderOffsetValue =
  | typeof DOCUMENT_REVIEW_ON_DAY_OFFSET.value
  | (typeof DOCUMENT_REVIEW_REMINDER_OFFSET_DEFS)[number]["value"];

export type DocumentReviewReminderEntityType =
  | "document"
  | "folder"
  | "repository";

type OffsetMeta = {
  value: DocumentReviewReminderOffsetValue;
  label: string;
  days?: number;
  months?: number;
};

export function getReminderOffsetMeta(
  value: string
): OffsetMeta | undefined {
  if (value === DOCUMENT_REVIEW_ON_DAY_OFFSET.value) {
    return DOCUMENT_REVIEW_ON_DAY_OFFSET;
  }
  return DOCUMENT_REVIEW_REMINDER_OFFSET_DEFS.find(
    (item) => item.value === value
  );
}

/** Always include on_day, plus any valid org-selected advance offsets. */
export function getEffectiveReminderOffsets(
  selectedOffsets: readonly string[] | null | undefined
): DocumentReviewReminderOffsetValue[] {
  const unique = new Set<DocumentReviewReminderOffsetValue>([
    DOCUMENT_REVIEW_ON_DAY_OFFSET.value,
  ]);
  for (const offset of selectedOffsets ?? []) {
    if (getReminderOffsetMeta(offset)) {
      unique.add(offset as DocumentReviewReminderOffsetValue);
    }
  }
  return [...unique];
}

/** UTC midnight for the calendar day of `date`. */
export function utcDayStart(date: Date): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      0,
      0,
      0,
      0
    )
  );
}

export function utcDayRange(date: Date): {
  start: Date;
  end: Date;
  key: string;
} {
  const start = utcDayStart(date);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end, key: start.toISOString().slice(0, 10) };
}

/**
 * Review calendar day that should fire a reminder for `offset` on `runDate`.
 * e.g. 1_week → runDate + 7 days; on_day → runDate.
 */
export function getReviewDateTargetForOffset(
  runDate: Date,
  offsetValue: string
): Date | null {
  const meta = getReminderOffsetMeta(offsetValue);
  if (!meta) return null;
  const target = utcDayStart(runDate);
  // Noon UTC avoids DST edge cases when adding months in local TZ; we stay UTC.
  target.setUTCHours(12, 0, 0, 0);
  if (meta.months) {
    target.setUTCMonth(target.getUTCMonth() + meta.months);
  } else if (typeof meta.days === "number") {
    target.setUTCDate(target.getUTCDate() + meta.days);
  }
  return utcDayStart(target);
}

function addReviewInterval(date: Date, interval: DocumentReviewInterval): void {
  if (interval === "Quarterly") date.setUTCMonth(date.getUTCMonth() + 3);
  else if (interval === "Half yearly") date.setUTCMonth(date.getUTCMonth() + 6);
  else date.setUTCFullYear(date.getUTCFullYear() + 1);
}

/**
 * Next repository review anniversary on or after `asOf` (UTC day).
 * Unlike the display helper that skips "today", this treats an anniversary
 * that lands on `asOf` as due that day.
 */
export function computeRepoReviewDateOnOrAfter(
  createdOn: Date,
  interval: DocumentReviewInterval,
  asOf: Date
): Date | null {
  if (!createdOn || Number.isNaN(createdOn.getTime())) return null;
  const asOfStart = utcDayStart(asOf);
  const date = utcDayStart(createdOn);
  // First anniversary is one interval after creation (matches FE display).
  let guard = 0;
  do {
    addReviewInterval(date, interval);
    guard += 1;
  } while (date < asOfStart && guard < 500);
  return guard >= 500 ? null : date;
}

export function formatReviewDateLabel(date: Date): string {
  try {
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function buildReminderMessage(input: {
  entityType: DocumentReviewReminderEntityType;
  name: string;
  reviewDateLabel: string;
  offset: string;
}): string {
  const kind =
    input.entityType === "folder"
      ? "Folder"
      : input.entityType === "repository"
        ? "Repository"
        : "Document";
  if (input.offset === DOCUMENT_REVIEW_ON_DAY_OFFSET.value) {
    return `${kind} "${input.name}" is due for review today (${input.reviewDateLabel}).`;
  }
  const offsetMeta = getReminderOffsetMeta(input.offset);
  return `${kind} "${input.name}" is due for review on ${input.reviewDateLabel}. This is your ${offsetMeta?.label || input.offset} reminder.`;
}

export function reminderTitle(
  entityType: DocumentReviewReminderEntityType
): string {
  if (entityType === "folder") return "Folder review reminder";
  if (entityType === "repository") return "Repository review reminder";
  return "Document review reminder";
}
