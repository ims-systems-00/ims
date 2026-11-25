import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Users,
} from "lucide-react";
import { EmptyState } from "@/shared/components/empty-state";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import {
  useTrainingOverviewQuery,
  useTrainingReadinessQuery,
} from "../hooks/use-training";
import type { TrainingHubView } from "../types";

type TrainingOverviewPanelProps = {
  onJumpView: (view: TrainingHubView) => void;
};

export function TrainingOverviewPanel({
  onJumpView,
}: TrainingOverviewPanelProps) {
  const overviewQuery = useTrainingOverviewQuery();
  const readinessQuery = useTrainingReadinessQuery();
  const data = overviewQuery.data;
  const readiness = readinessQuery.data ?? [];

  if (overviewQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading overview…
      </div>
    );
  }

  if (!data) {
    return (
      <EmptyState
        title="Overview unavailable"
        description="Could not load training overview. Try refreshing the page."
      />
    );
  }

  const cards = [
    {
      label: "Active people",
      value: data.peopleActive,
      icon: Users,
      tone: "primary" as const,
      onClick: () => onJumpView("people"),
    },
    {
      label: "Fully compliant",
      value: data.compliantPeople,
      icon: CheckCircle2,
      tone: "ok" as const,
      onClick: () => onJumpView("matrix"),
    },
    {
      label: "Missing",
      value: data.gapsMissing,
      icon: AlertTriangle,
      tone: data.gapsMissing > 0 ? ("danger" as const) : ("muted" as const),
      onClick: () => onJumpView("matrix"),
    },
    {
      label: "Expired",
      value: data.gapsOver,
      icon: AlertTriangle,
      tone: data.gapsOver > 0 ? ("danger" as const) : ("muted" as const),
      onClick: () => onJumpView("matrix"),
    },
    {
      label: "Due soon",
      value: data.gapsSoon,
      icon: ClipboardList,
      tone: data.gapsSoon > 0 ? ("warn" as const) : ("muted" as const),
      onClick: () => onJumpView("plan"),
    },
    {
      label: "Sessions planned",
      value: data.sessionsPlanned,
      icon: BookOpen,
      tone: "muted" as const,
      onClick: () => onJumpView("sessions"),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.label}
              type="button"
              onClick={card.onClick}
              className={cn(
                "rounded-xl border border-border-subtle bg-card p-4 text-left transition hover:border-primary/40",
                card.tone === "danger" && "border-destructive/30",
                card.tone === "warn" && "border-amber-500/30"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {card.label}
                </span>
                <Icon className="size-4 text-muted-foreground" />
              </div>
              <div className="mt-2 text-2xl font-semibold tracking-tight">
                {card.value}
              </div>
            </button>
          );
        })}
      </div>

      <section className="rounded-xl border border-border-subtle bg-card p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold">Audit readiness</h3>
            <p className="text-xs text-muted-foreground">
              {data.readinessOk}/{data.readinessTotal} live checks passing.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onJumpView("auditor")}
          >
            Auditor pack
          </Button>
        </div>
        {readinessQuery.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading checks…
          </div>
        ) : (
          <div className="space-y-2">
            {readiness.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-2 rounded-lg border border-border-subtle/80 px-3 py-2"
              >
                {item.ok ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                )}
                <div className="min-w-0">
                  <div className="text-sm font-medium leading-snug">
                    {item.text}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {item.basis} · {item.tag}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
