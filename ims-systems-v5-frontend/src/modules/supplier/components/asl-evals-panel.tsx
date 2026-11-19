import { useMemo } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { EmptyState } from "@/shared/components/empty-state";
import { Button } from "@/shared/components/ui/button";
import { lastEval } from "../lib/asl-display";
import {
  useAslSettingsQuery,
  useAslSuppliersQuery,
} from "../hooks/use-asl-supplier";
import { AslCritBadge, AslStatusBadge } from "./asl-badges";

type AslEvalsPanelProps = {
  onOpenSupplier: (id: string, tab?: string) => void;
};

function addMonths(dateIso: string, months: number): string {
  const d = new Date(dateIso);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

export function AslEvalsPanel({ onOpenSupplier }: AslEvalsPanelProps) {
  const listQuery = useAslSuppliersQuery({ page: 1, pageSize: 100 });
  const settingsQuery = useAslSettingsQuery();

  const rows = useMemo(() => {
    const interval = settingsQuery.data?.interval;
    if (!interval) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const items = (listQuery.data?.items ?? []).filter(
      (s) => s.status !== "Removed" && s.status !== "Prospective"
    );
    return items
      .map((s) => {
        const last = lastEval(s);
        const base = last?.date ?? s.appon;
        const next = base
          ? addMonths(base, interval[s.crit] ?? 12)
          : null;
        const dueDays = next
          ? Math.round(
              (new Date(next).getTime() - today.getTime()) / 86_400_000
            )
          : null;
        return {
          supplier: s,
          last,
          next,
          dueDays,
          overdue: dueDays !== null && dueDays < 0,
          soon: dueDays !== null && dueDays >= 0 && dueDays <= 30,
          missing: !last,
        };
      })
      .filter((r) => r.missing || r.overdue || r.soon)
      .sort((a, b) => {
        if (a.missing !== b.missing) return a.missing ? -1 : 1;
        return (a.dueDays ?? 0) - (b.dueDays ?? 0);
      });
  }, [listQuery.data, settingsQuery.data]);

  if (listQuery.isLoading || settingsQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading evaluations…
      </div>
    );
  }

  if (!rows.length) {
    return (
      <EmptyState
        title="No evaluations due"
        description="All approved suppliers are within their re-evaluation window."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border-subtle">
      <table className="ims-table w-full text-sm">
        <thead>
          <tr>
            <th>Supplier</th>
            <th>Last eval</th>
            <th>Score</th>
            <th>Next due</th>
            <th className="w-[1%]" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.supplier.id}>
              <td>
                <div className="font-medium">{row.supplier.name}</div>
                <div className="flex flex-wrap gap-1">
                  <AslCritBadge crit={row.supplier.crit} />
                  <AslStatusBadge status={row.supplier.status} />
                </div>
              </td>
              <td>{row.last?.date ?? "—"}</td>
              <td>{row.last ? row.last.score.toFixed(1) : "—"}</td>
              <td>
                {row.missing
                  ? "No evaluation"
                  : row.overdue
                    ? `Overdue since ${row.next}`
                    : row.next}
              </td>
              <td>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    onOpenSupplier(row.supplier.id, "evaluations")
                  }
                >
                  <ExternalLink className="size-3.5" />
                  Evaluate
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
