import { cn } from "@/shared/lib/utils";
import type { IncidentDisplayStatus, IncidentStats } from "../types";

type StatTone = "neutral" | "info" | "warning" | "success";

type StatCardDef = {
  key: keyof Pick<IncidentStats, "total" | "open" | "escalated" | "resolved">;
  label: string;
  tone: StatTone;
  filterStatus?: IncidentDisplayStatus | null;
};

const STAT_CARDS: StatCardDef[] = [
  { key: "total", label: "Total", tone: "neutral", filterStatus: null },
  { key: "open", label: "Open", tone: "info", filterStatus: "Open" },
  {
    key: "escalated",
    label: "Escalated",
    tone: "warning",
    filterStatus: "Escalated",
  },
  {
    key: "resolved",
    label: "Resolved",
    tone: "success",
    filterStatus: "Resolved",
  },
];

const toneClass: Record<StatTone, string> = {
  neutral: "border-border bg-surface text-foreground",
  info: "border-info/25 bg-info/10 text-info",
  warning: "border-warning/30 bg-warning/15 text-warning-foreground",
  success: "border-success/25 bg-success/10 text-success",
};

const valueClass: Record<StatTone, string> = {
  neutral: "text-foreground",
  info: "text-info",
  warning: "text-warning-foreground",
  success: "text-success",
};

type IncidentStatsCardsProps = {
  stats: IncidentStats;
  activeStatus?: string;
  onSelectStatus?: (status: IncidentDisplayStatus | "") => void;
};

export function IncidentStatsCards({
  stats,
  activeStatus = "",
  onSelectStatus,
}: IncidentStatsCardsProps) {
  return (
    <div
      className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      role="group"
      aria-label="Incident summary"
    >
      {STAT_CARDS.map((card) => {
        const isActive =
          card.filterStatus === null
            ? !activeStatus
            : activeStatus === card.filterStatus;
        const interactive = Boolean(onSelectStatus);

        return (
          <button
            key={card.key}
            type="button"
            disabled={!interactive}
            aria-pressed={interactive ? isActive : undefined}
            className={cn(
              "rounded-md border px-3.5 py-3 text-left transition-[box-shadow,border-color,background-color]",
              toneClass[card.tone],
              interactive &&
                "cursor-pointer hover:shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
              interactive && isActive && "ring-2 ring-ring/35",
              !interactive && "cursor-default"
            )}
            onClick={() => {
              if (!onSelectStatus) return;
              if (!card.filterStatus) {
                onSelectStatus("");
                return;
              }
              onSelectStatus(
                activeStatus === card.filterStatus ? "" : card.filterStatus
              );
            }}
          >
            <p className="text-[0.6875rem] font-medium uppercase tracking-[0.06em] opacity-80">
              {card.label}
            </p>
            <p
              className={cn(
                "mt-1.5 text-2xl font-semibold tabular-nums tracking-tight",
                valueClass[card.tone]
              )}
            >
              {stats[card.key]}
            </p>
          </button>
        );
      })}
    </div>
  );
}
