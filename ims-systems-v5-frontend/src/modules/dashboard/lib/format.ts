import type { OrganisationalState } from "../types";

export function formatInteger(value: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(
    value
  );
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatHours(value: number | null): string {
  if (value == null) return "—";
  return `${new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 1,
  }).format(value)} h`;
}

export function formatAccurateAs(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function organisationalStateTone(
  state: OrganisationalState
): "success" | "info" | "warning" | "destructive" | "neutral" {
  switch (state) {
    case "Safe":
      return "success";
    case "Secure":
      return "info";
    case "Unsecure":
      return "warning";
    case "Vulnerable":
    case "Hazardous":
      return "destructive";
    default:
      return "neutral";
  }
}
