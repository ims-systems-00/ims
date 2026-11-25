import { Loader2 } from "lucide-react";
import { EmptyState } from "@/shared/components/empty-state";
import { cn } from "@/shared/lib/utils";
import { formatInterval } from "../lib/inventory-display";
import { useComplianceMapQuery } from "../hooks/use-inventory";

function IntervalBadge({ months }: { months: number }) {
  const eachUse = months === 0;
  return (
    <span
      className={cn(
        "inline-flex whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-semibold tabular-nums",
        eachUse
          ? "bg-sky-500/10 text-sky-800 dark:text-sky-300"
          : "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
      )}
    >
      {formatInterval(months)}
    </span>
  );
}

export function InventoryCompliancePanel() {
  const mapQuery = useComplianceMapQuery();
  const rows = mapQuery.data ?? [];

  if (mapQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading compliance map…
      </div>
    );
  }

  if (!rows.length) {
    return (
      <EmptyState
        title="No categories"
        description="Category control definitions are unavailable."
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Compliance map
          </h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            For each asset type: which standard applies, what must be checked,
            and how often. Live overdue status is on Overview / Inspections.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500/80" />
            Scheduled
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-sky-500/80" />
            Each use
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="rounded bg-amber-500/15 px-1 py-0.5 text-[10px] font-semibold text-amber-800 dark:text-amber-300">
              CP
            </span>
            Competent person
          </span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {rows.map((row) => (
          <section
            key={row.id}
            className="rounded-xl border border-border-subtle bg-card"
          >
            <div className="border-b border-border-subtle px-4 py-3">
              <h3 className="text-sm font-semibold tracking-tight">
                {row.name}
              </h3>
              {row.standards.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {row.standards.map((std) => (
                    <span
                      key={std}
                      className="rounded-md bg-surface-muted px-2 py-0.5 font-mono text-[10px] font-medium text-foreground/80"
                    >
                      {std}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <ul>
              {row.checks.map((check, index) => (
                <li
                  key={check.name}
                  className={cn(
                    "grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-3",
                    index > 0 && "border-t border-border-subtle"
                  )}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{check.name}</span>
                      {check.requiresCompetence ? (
                        <span
                          className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300"
                          title="Must be recorded by a named competent person"
                        >
                          CP
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      {check.basis}
                    </p>
                  </div>
                  <IntervalBadge months={check.intervalMonths} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
