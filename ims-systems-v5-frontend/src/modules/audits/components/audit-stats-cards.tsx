import { cn } from "@/shared/lib/utils";
import type { AuditDisplayStatus, AuditStats } from "../types";

type StatTone = "neutral" | "info" | "warning" | "success";

type StatCardDef = {
  key: keyof Pick<
    AuditStats,
    "total" | "scheduled" | "completed" | "upcoming"
  >;
  label: string;
  tone: StatTone;
  filterStatus?: AuditDisplayStatus | null;
  upcoming?: boolean;
};

const STAT_CARDS: StatCardDef[] = [
  { key: "total", label: "Total", tone: "neutral", filterStatus: null },
  {
    key: "scheduled",
    label: "Scheduled",
    tone: "info",
    filterStatus: "Scheduled",
  },
  {
    key: "upcoming",
    label: "Upcoming",
    tone: "warning",
    upcoming: true,
  },
  {
    key: "completed",
    label: "Completed",
    tone: "success",
    filterStatus: "Completed",
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

type AuditStatsCardsProps = {
  stats: AuditStats;
  activeStatus?: string;
  upcoming?: boolean;
  onSelectStatus?: (status: AuditDisplayStatus | "") => void;
  onSelectUpcoming?: (upcoming: boolean) => void;
};

export function AuditStatsCards({
  stats,
  activeStatus = "",
  upcoming = false,
  onSelectStatus,
  onSelectUpcoming,
}: AuditStatsCardsProps) {
  return (
    <div
      className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      role="group"
      aria-label="Audit summary"
    >
      {STAT_CARDS.map((card) => {
        const isActive = card.upcoming
          ? upcoming
          : card.filterStatus === null
            ? !activeStatus && !upcoming
            : activeStatus === card.filterStatus && !upcoming;
        const interactive = Boolean(onSelectStatus || onSelectUpcoming);

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
              if (card.upcoming) {
                onSelectUpcoming?.(!upcoming);
                onSelectStatus?.("");
                return;
              }
              if (!onSelectStatus) return;
              onSelectUpcoming?.(false);
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
