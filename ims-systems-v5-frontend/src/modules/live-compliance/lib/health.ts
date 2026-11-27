import type { AdviceSeverity, ClauseHealthStatus } from "../types";

export const HEALTH_LABELS: Record<ClauseHealthStatus, string> = {
  not: "Not started",
  prog: "In progress",
  impl: "Implemented",
  sus: "Sustained",
  risk: "At risk",
  lapsed: "Lapsed",
};

export type HealthTone = "neutral" | "success" | "warning" | "destructive" | "info";

export const HEALTH_TONES: Record<ClauseHealthStatus, HealthTone> = {
  not: "neutral",
  prog: "info",
  impl: "success",
  sus: "success",
  risk: "warning",
  lapsed: "destructive",
};

/** Text colour class for rings / dots (theme tokens). */
export const HEALTH_TEXT_CLASS: Record<ClauseHealthStatus, string> = {
  not: "text-muted-foreground",
  prog: "text-info",
  impl: "text-success",
  sus: "text-success",
  risk: "text-warning",
  lapsed: "text-destructive",
};

/** Small status dots (background colour). */
export const HEALTH_DOT_CLASS: Record<ClauseHealthStatus, string> = {
  not: "bg-muted-foreground/40",
  prog: "bg-info",
  impl: "bg-success",
  sus: "bg-success",
  risk: "bg-warning",
  lapsed: "bg-destructive",
};

export const SEVERITY_DOT_CLASS: Record<AdviceSeverity, string> = {
  high: "bg-destructive",
  med: "bg-warning",
  low: "bg-info",
};

export const SEVERITY_BORDER_CLASS: Record<AdviceSeverity, string> = {
  high: "border-l-destructive",
  med: "border-l-warning",
  low: "border-l-info",
};

export const SEVERITY_LABELS: Record<AdviceSeverity, string> = {
  high: "High",
  med: "Medium",
  low: "Low",
};

/** Headline for a module/standard from its worst clause status. */
export function healthHeadline(worst: ClauseHealthStatus, total: number): string {
  if (!total) return "No clauses monitored yet";
  if (worst === "lapsed") return "Action needed to stay compliant";
  if (worst === "risk") return "Compliant today, something needs attention soon";
  if (worst === "prog" || worst === "not") return "Some clauses are not fully in place yet";
  return "Compliant and up to date";
}

/** "29 Nov 2026" from an ISO date. */
export function formatDay(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
