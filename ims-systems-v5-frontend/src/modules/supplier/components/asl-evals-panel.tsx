import { useMemo, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { EmptyState } from "@/shared/components/empty-state";
import { EntityTableRow } from "@/shared/components/entity-table-row";
import { Button } from "@/shared/components/ui/button";
import { lastEval, nextEvalDate } from "../lib/asl-display";
import {
  useAslSettingsQuery,
  useAslSuppliersQuery,
} from "../hooks/use-asl-supplier";
import { AslCritBadge, AslStatusBadge } from "./asl-badges";
import {
  ASL_TABLE_PAGE_SIZE,
  AslTablePagination,
  paginateRows,
} from "./asl-table-pagination";

type AslEvalsPanelProps = {
  onOpenSupplier: (id: string, tab?: string) => void;
};

/**
 * Hub Evaluations tab: re-evaluation due queue plus recent scores across the
 * ASL. Open a supplier to record a new evaluation or inspect history.
 */
export function AslEvalsPanel({ onOpenSupplier }: AslEvalsPanelProps) {
  const [duePage, setDuePage] = useState(1);
  const [recentPage, setRecentPage] = useState(1);
  const listQuery = useAslSuppliersQuery({ page: 1, pageSize: 100 });
  const settingsQuery = useAslSettingsQuery();

  const { due, recent } = useMemo(() => {
    const interval = settingsQuery.data?.interval;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const items = (listQuery.data?.items ?? []).filter(
      (s) => s.status !== "Removed" && s.status !== "Prospective"
    );

    const dueRows = interval
      ? items
          .map((s) => {
            const last = lastEval(s);
            const next = nextEvalDate(s, interval);
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
              missing: !last && !s.evalDue,
            };
          })
          .filter((r) => r.missing || r.overdue || r.soon)
          .sort((a, b) => {
            if (a.missing !== b.missing) return a.missing ? -1 : 1;
            return (a.dueDays ?? 0) - (b.dueDays ?? 0);
          })
      : [];

    const recentRows = items
      .flatMap((s) =>
        s.evals.map((e) => ({
          supplier: s,
          eval: e,
        }))
      )
      .sort((a, b) => (a.eval.date < b.eval.date ? 1 : -1));

    return { due: dueRows, recent: recentRows };
  }, [listQuery.data, settingsQuery.data]);

  const duePaged = paginateRows(due, duePage, ASL_TABLE_PAGE_SIZE);
  const recentPaged = paginateRows(recent, recentPage, ASL_TABLE_PAGE_SIZE);

  if (listQuery.isLoading || settingsQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading evaluations…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold">Due for re-evaluation</h2>
          <p className="ims-text-meta">
            Missing, overdue, or due within 30 days by criticality interval
          </p>
        </div>

        {due.length === 0 ? (
          <EmptyState
            title="No evaluations due"
            description="All approved suppliers are within their re-evaluation window."
          />
        ) : (
          <>
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
                  {duePaged.items.map((row) => (
                    <EntityTableRow
                      key={row.supplier.id}
                      onOpen={() =>
                        onOpenSupplier(row.supplier.id, "evaluations")
                      }
                    >
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
                    </EntityTableRow>
                  ))}
                </tbody>
              </table>
            </div>
            <AslTablePagination
              page={duePaged.page}
              totalPages={duePaged.totalPages}
              total={duePaged.total}
              pageSize={ASL_TABLE_PAGE_SIZE}
              onPageChange={setDuePage}
            />
          </>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold">Recent evaluations</h2>
          <p className="ims-text-meta">
            Latest recorded scores — open a supplier to see full criterion
            breakdown
          </p>
        </div>

        {recent.length === 0 ? (
          <EmptyState
            title="No evaluations recorded"
            description="Record an evaluation from a supplier’s Evaluations tab in the side sheet."
          />
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border border-border-subtle">
              <table className="ims-table w-full text-sm">
                <thead>
                  <tr>
                    <th>Supplier</th>
                    <th>Date</th>
                    <th>Score</th>
                    <th>By</th>
                    <th>Notes</th>
                    <th className="w-[1%]" />
                  </tr>
                </thead>
                <tbody>
                  {recentPaged.items.map((row) => (
                    <EntityTableRow
                      key={`${row.supplier.id}-${row.eval.id}`}
                      onOpen={() =>
                        onOpenSupplier(row.supplier.id, "evaluations")
                      }
                    >
                      <td>
                        <div className="font-medium">{row.supplier.name}</div>
                        <AslCritBadge crit={row.supplier.crit} />
                      </td>
                      <td>{row.eval.date}</td>
                      <td className="font-semibold tabular-nums">
                        {row.eval.score.toFixed(1)}
                      </td>
                      <td>{row.eval.by}</td>
                      <td className="max-w-[14rem] truncate text-muted-foreground">
                        {row.eval.note || "—"}
                      </td>
                      <td>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            onOpenSupplier(row.supplier.id, "evaluations")
                          }
                        >
                          <ExternalLink className="size-3.5" />
                          Open
                        </Button>
                      </td>
                    </EntityTableRow>
                  ))}
                </tbody>
              </table>
            </div>
            <AslTablePagination
              page={recentPaged.page}
              totalPages={recentPaged.totalPages}
              total={recentPaged.total}
              pageSize={ASL_TABLE_PAGE_SIZE}
              onPageChange={setRecentPage}
            />
          </>
        )}
      </section>
    </div>
  );
}
