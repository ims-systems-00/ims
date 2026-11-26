import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Package,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import { EmptyState } from "@/shared/components/empty-state";
import { EntityTableRow } from "@/shared/components/entity-table-row";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { formatWhen } from "../lib/inventory-display";
import { useInventoryOverviewQuery } from "../hooks/use-inventory";
import type { InventoryHubView } from "../types";
import { PageLoader } from "@/shared/components/ims-loader";

type InventoryOverviewPanelProps = {
  onOpenAsset: (id: string) => void;
  onJumpView: (view: InventoryHubView) => void;
};

export function InventoryOverviewPanel({
  onOpenAsset,
  onJumpView,
}: InventoryOverviewPanelProps) {
  const overviewQuery = useInventoryOverviewQuery();
  const data = overviewQuery.data;

  if (overviewQuery.isLoading) {
    return (
      <PageLoader label="Loading overview…" />
    );
  }

  if (!data) {
    return (
      <EmptyState
        title="Overview unavailable"
        description="Could not load inventory overview. Try refreshing the page."
      />
    );
  }

  const { totals, attention, readiness, activity, aliceSummary } = data;
  const passCount = readiness.filter((r) => r.ok).length;

  const cards = [
    {
      label: "Active assets",
      value: totals.assets,
      icon: Package,
      tone: "primary" as const,
      onClick: () => onJumpView("register"),
    },
    {
      label: "In service",
      value: totals.inService,
      icon: CheckCircle2,
      tone: "ok" as const,
      onClick: () => onJumpView("register"),
    },
    {
      label: "Quarantined",
      value: totals.quarantined,
      icon: ShieldAlert,
      tone: totals.quarantined > 0 ? ("danger" as const) : ("muted" as const),
      onClick: () => onJumpView("register"),
    },
    {
      label: "Under maintenance",
      value: totals.underMaintenance,
      icon: Wrench,
      tone:
        totals.underMaintenance > 0 ? ("warn" as const) : ("muted" as const),
      onClick: () => onJumpView("register"),
    },
    {
      label: "Overdue checks",
      value: totals.overdueChecks,
      icon: AlertTriangle,
      tone: totals.overdueChecks > 0 ? ("danger" as const) : ("muted" as const),
      onClick: () => onJumpView("schedule"),
    },
    {
      label: "Due soon",
      value: totals.soonChecks,
      icon: ClipboardList,
      tone: totals.soonChecks > 0 ? ("warn" as const) : ("muted" as const),
      onClick: () => onJumpView("schedule"),
    },
  ];

  return (
    <div className="space-y-5">
      {aliceSummary ? (
        <section className="rounded-xl border border-border-subtle bg-card p-4">
          <h3 className="text-sm font-semibold">Alice</h3>
          <p className="mt-1 text-sm text-muted-foreground">{aliceSummary}</p>
        </section>
      ) : null}
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

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-border-subtle bg-card p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold">Needs attention</h3>
              <p className="text-xs text-muted-foreground">
                Overdue checks and quarantined equipment, severity first.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onJumpView("schedule")}
            >
              Open schedule
            </Button>
          </div>
          {attention.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">
              Nothing needs attention right now.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="ims-table w-full">
                <tbody>
                  {attention.slice(0, 8).map((item) => (
                    <EntityTableRow
                      key={`${item.assetId}-${item.message}`}
                      onOpen={() => onOpenAsset(item.assetId)}
                    >
                      <td>
                        <div className="font-medium">
                          {item.tag} · {item.name}
                        </div>
                        <div className="ims-text-meta">{item.message}</div>
                      </td>
                      <td>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                            item.severity === "high"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                          )}
                        >
                          {item.severity}
                        </span>
                      </td>
                    </EntityTableRow>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-border-subtle bg-card p-4">
          <h3 className="text-sm font-semibold">Audit readiness</h3>
          <p className="mb-3 text-xs text-muted-foreground">
            {passCount}/{readiness.length} live checks passing against ISO /
            UK regs.
          </p>
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
                    {item.label}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {item.detail}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-border-subtle bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold">Activity · last 90 days</h3>
        {activity.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent activity.</p>
        ) : (
          <div className="space-y-2">
            {activity.slice(0, 12).map((h, idx) => (
              <div
                key={`${h.t}-${idx}`}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-sm"
              >
                <span className="text-xs text-muted-foreground">
                  {formatWhen(h.t)}
                </span>
                <span className="font-medium">{h.by}</span>
                <span className="text-muted-foreground">{h.what}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
