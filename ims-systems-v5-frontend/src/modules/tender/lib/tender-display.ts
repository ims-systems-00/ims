import type {
  TenderGateVerdict,
  TenderHubView,
  TenderQuestionStatus,
  TenderQuestionnaireStatus,
  TenderRequirementLevel,
  TenderRequirementStatus,
} from "../types";
import { TENDER_VIEW_LABELS } from "../types";

export { TENDER_VIEW_LABELS };

export function questionnaireStatusLabel(
  status: TenderQuestionnaireStatus | string
): string {
  switch (status) {
    case "new":
      return "New";
    case "drafting":
      return "Drafting";
    case "review":
      return "In review";
    case "ready":
      return "Ready";
    case "submitted":
      return "Submitted";
    default:
      return status;
  }
}

export function questionStatusLabel(
  status: TenderQuestionStatus | string
): string {
  switch (status) {
    case "blank":
      return "Blank";
    case "draft":
      return "Draft";
    case "edited":
      return "Edited";
    case "needs-input":
      return "Needs input";
    case "accepted":
      return "Accepted";
    case "approved":
      return "Approved";
    default:
      return status;
  }
}

export function gateVerdictLabel(verdict: TenderGateVerdict | string): string {
  switch (verdict) {
    case "bid":
      return "Bid";
    case "review":
      return "Review";
    case "no-bid-risk":
      return "No-bid risk";
    default:
      return verdict;
  }
}

export function requirementLevelLabel(
  level: TenderRequirementLevel | string
): string {
  switch (level) {
    case "mandatory":
      return "Mandatory";
    case "desirable":
      return "Desirable";
    default:
      return level;
  }
}

export function requirementStatusLabel(
  status: TenderRequirementStatus | string
): string {
  switch (status) {
    case "comply":
      return "Comply";
    case "partial":
      return "Partial";
    case "no":
      return "Do not comply";
    case "unassessed":
      return "Unassessed";
    default:
      return status;
  }
}

export function questionnaireStatusTone(
  status: TenderQuestionnaireStatus | string
): "ok" | "warn" | "danger" | "muted" | "primary" {
  switch (status) {
    case "ready":
    case "submitted":
      return "ok";
    case "drafting":
    case "review":
      return "warn";
    case "new":
      return "primary";
    default:
      return "muted";
  }
}

export function questionStatusTone(
  status: TenderQuestionStatus | string
): "ok" | "warn" | "danger" | "muted" | "primary" {
  switch (status) {
    case "approved":
    case "accepted":
      return "ok";
    case "draft":
    case "edited":
      return "primary";
    case "needs-input":
      return "warn";
    case "blank":
      return "muted";
    default:
      return "muted";
  }
}

export function gateVerdictTone(
  verdict: TenderGateVerdict | string
): "ok" | "warn" | "danger" | "muted" {
  switch (verdict) {
    case "bid":
      return "ok";
    case "review":
      return "warn";
    case "no-bid-risk":
      return "danger";
    default:
      return "muted";
  }
}

export function requirementStatusTone(
  status: TenderRequirementStatus | string
): "ok" | "warn" | "danger" | "muted" {
  switch (status) {
    case "comply":
      return "ok";
    case "partial":
      return "warn";
    case "no":
      return "danger";
    default:
      return "muted";
  }
}

export function toneBadgeClass(
  tone: "ok" | "warn" | "danger" | "muted" | "primary"
): string {
  switch (tone) {
    case "ok":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
    case "warn":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-400";
    case "danger":
      return "bg-destructive/10 text-destructive";
    case "primary":
      return "bg-primary/10 text-primary";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      dateStyle: "medium",
    });
  } catch {
    return iso;
  }
}

export function formatMoney(
  value: number | null | undefined,
  currency = "GBP"
): string {
  if (value == null || Number.isNaN(value)) return "—";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return String(value);
  }
}

export function formatConfidence(value: number | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${Math.round(value * 100)}%`;
}

export function hubViewLabel(view: TenderHubView): string {
  return TENDER_VIEW_LABELS[view];
}

export function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / (24 * 60 * 60 * 1000));
}

export function expiryTone(
  iso: string | null | undefined,
  warnDays = 60
): "ok" | "warn" | "danger" | "muted" {
  const days = daysUntil(iso);
  if (days == null) return "muted";
  if (days < 0) return "danger";
  if (days <= warnDays) return "warn";
  return "ok";
}
