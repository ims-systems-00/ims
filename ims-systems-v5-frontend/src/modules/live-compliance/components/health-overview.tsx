import { cn } from "@/shared/lib/utils";
import type { StandardHealth } from "../types";
import { HealthRing } from "./health-ring";

/** One card per ISO standard: progress ring + clause counts. */
export function HealthOverview({
  standards,
  className,
}: {
  standards: StandardHealth[];
  className?: string;
}) {
  return (
    <div className={cn("grid gap-3 md:grid-cols-3", className)}>
      {standards.map((s) => (
        <div
          key={s.standard}
          className="flex items-center gap-5 rounded-xl border border-border-subtle bg-card px-5 py-4"
        >
          <HealthRing percentage={s.percentage} worst={s.worst} size={72} thickness={4} />
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium text-foreground">{s.standard}</p>
            <p className="text-xs text-muted-foreground">{s.percentage}% compliant today</p>
            <p className="flex flex-wrap gap-x-2.5 text-xs text-muted-foreground">
              <span>{s.sustained + s.implemented} in place</span>
              <span className={cn(s.atRisk > 0 && "text-warning-foreground")}>{s.atRisk} at risk</span>
              <span className={cn(s.lapsed > 0 && "text-destructive")}>{s.lapsed} lapsed</span>
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
