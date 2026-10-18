import type { DocumentReviewInterval } from "../types";

export function formatDocumentDate(
  value: string | Date | null | undefined
): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Short numeric date (e.g. 09/09/2024) for upload captions. */
export function formatDocumentDateShort(
  value: string | Date | null | undefined
): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
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
