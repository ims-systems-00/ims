import { formatDate } from "@/shared/lib/format-date";
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

/** Approximate next review from created date + interval (display helper). */
export function computeRepoReviewDate(
  createdOn: string,
  interval: DocumentReviewInterval
): Date {
  const date = new Date(createdOn);
  if (interval === "Quarterly") date.setMonth(date.getMonth() + 3);
  else if (interval === "Half yearly") date.setMonth(date.getMonth() + 6);
  else date.setFullYear(date.getFullYear() + 1);
  return date;
}
