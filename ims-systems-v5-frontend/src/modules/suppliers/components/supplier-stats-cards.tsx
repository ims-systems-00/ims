import { cn } from "@/shared/lib/utils";
import type { SupplierStats } from "../types";
import { SupplierRiskLevelBadge } from "./supplier-badges";

type SupplierStatsCardsProps = {
  stats: SupplierStats;
  activeCompliant?: boolean | null;
  onSelectCompliant?: (value: boolean | null) => void;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);
}

export function SupplierStatsCards({
  stats,
  activeCompliant = null,
  onSelectCompliant,
}: SupplierStatsCardsProps) {
  const interactive = Boolean(onSelectCompliant);

  return (
    <div
      className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      role="group"
      aria-label="Supplier summary"
    >
      <div className="rounded-md border border-border bg-surface px-3.5 py-3">
        <p className="text-[0.6875rem] font-medium uppercase tracking-[0.06em] text-muted-foreground">
          Procurement value
        </p>
        <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight">
          {formatCurrency(stats.procurementValue)}
        </p>
      </div>

      <button
        type="button"
        disabled={!interactive}
        aria-pressed={interactive ? activeCompliant === true : undefined}
        className={cn(
          "rounded-md border px-3.5 py-3 text-left transition-[box-shadow,border-color]",
          "border-success/25 bg-success/10",
          interactive &&
            "cursor-pointer hover:shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
          interactive && activeCompliant === true && "ring-2 ring-ring/35",
          !interactive && "cursor-default"
        )}
        onClick={() => {
          if (!onSelectCompliant) return;
          onSelectCompliant(activeCompliant === true ? null : true);
        }}
      >
        <p className="text-[0.6875rem] font-medium uppercase tracking-[0.06em] text-success opacity-80">
          Compliant
        </p>
        <p className="mt-1.5 text-2xl font-semibold tabular-nums text-success tracking-tight">
          {stats.supplierCompliance.compliant}
        </p>
        <p className="mt-1 text-[0.6875rem] text-muted-foreground">
          {stats.supplierCompliance.percentage}% ·{" "}
          <SupplierRiskLevelBadge
            riskLevel={stats.supplierCompliance.riskLevel}
          />
        </p>
      </button>

      <button
        type="button"
        disabled={!interactive}
        aria-pressed={interactive ? activeCompliant === false : undefined}
        className={cn(
          "rounded-md border px-3.5 py-3 text-left transition-[box-shadow,border-color]",
          "border-warning/30 bg-warning/15",
          interactive &&
            "cursor-pointer hover:shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
          interactive && activeCompliant === false && "ring-2 ring-ring/35",
          !interactive && "cursor-default"
        )}
        onClick={() => {
          if (!onSelectCompliant) return;
          onSelectCompliant(activeCompliant === false ? null : false);
        }}
      >
        <p className="text-[0.6875rem] font-medium uppercase tracking-[0.06em] text-warning-foreground opacity-80">
          Not compliant
        </p>
        <p className="mt-1.5 text-2xl font-semibold tabular-nums text-warning-foreground tracking-tight">
          {stats.supplierCompliance.inCompliant}
        </p>
      </button>

      <div className="rounded-md border border-border bg-surface px-3.5 py-3">
        <p className="text-[0.6875rem] font-medium uppercase tracking-[0.06em] text-muted-foreground">
          Supplier incidents
        </p>
        <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight">
          {stats.supplierIncidents.totalIncidents}
        </p>
        <p className="mt-1 text-[0.6875rem] text-muted-foreground">
          {stats.supplierIncidents.openIncidents} open ·{" "}
          {stats.supplierIncidents.resolvedIncidents} resolved
        </p>
      </div>
    </div>
  );
}
