import type {
  TrainingCellState,
  TrainingHubView,
  TrainingPersonStatus,
  TrainingSessionStatus,
} from "../types";

export const TRAINING_VIEW_LABELS: Record<TrainingHubView, string> = {
  overview: "Overview",
  matrix: "Matrix",
  people: "People",
  plan: "Training plan",
  sessions: "Sessions",
  courses: "Courses",
  roles: "Roles",
  auditor: "Auditor pack",
  settings: "Settings",
  log: "Change log",
};

export function cellLabel(state: TrainingCellState | undefined): string {
  switch (state) {
    case "ok":
      return "In date";
    case "soon":
      return "Due soon";
    case "over":
      return "Expired";
    case "none":
      return "Missing";
    case "grace":
      return "Induction window";
    case "na":
      return "N/A";
    default:
      return "—";
  }
}

export function cellIcon(state: TrainingCellState | undefined): string {
  switch (state) {
    case "ok":
      return "✓";
    case "soon":
      return "!";
    case "over":
      return "✕";
    case "none":
      return "–";
    case "grace":
      return "~";
    case "na":
      return "N/A";
    default:
      return "";
  }
}

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

/** Fraction of validity remaining for an in-date cell (0–1). */
export function validityLeft(
  months: number,
  daysRemaining: number | null
): number {
  if (!months || daysRemaining == null) return 1;
  const total = months * 30.4;
  if (total <= 0) return 1;
  return Math.max(0, Math.min(1, daysRemaining / total));
}

export function cellTone(
  state: TrainingCellState | undefined
): "ok" | "warn" | "danger" | "muted" {
  switch (state) {
    case "ok":
      return "ok";
    case "soon":
    case "grace":
      return "warn";
    case "over":
    case "none":
      return "danger";
    default:
      return "muted";
  }
}

export function personStatusTone(
  status: TrainingPersonStatus | string
): "ok" | "warn" | "danger" | "muted" {
  switch (status) {
    case "Active":
      return "ok";
    case "Pre-start":
      return "warn";
    case "Leaver":
      return "muted";
    default:
      return "muted";
  }
}

export function sessionStatusTone(
  status: TrainingSessionStatus | string
): "ok" | "warn" | "danger" | "muted" {
  switch (status) {
    case "Planned":
      return "warn";
    case "Completed":
      return "ok";
    case "Cancelled":
      return "muted";
    default:
      return "muted";
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
    return new Date(iso + (iso.length === 10 ? "T00:00:00" : "")).toLocaleDateString(
      undefined,
      { dateStyle: "medium" }
    );
  } catch {
    return iso;
  }
}

export function formatInterval(months: number): string {
  if (months === 0) return "Does not expire";
  if (months === 1) return "Monthly";
  if (months === 12) return "Annual";
  return `Every ${months} months`;
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
