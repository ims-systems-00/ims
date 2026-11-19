import { Loader2, Mail, ExternalLink } from "lucide-react";
import { EmptyState } from "@/shared/components/empty-state";
import { Button } from "@/shared/components/ui/button";
import { useAslOverviewQuery } from "../hooks/use-asl-supplier";
import { AslCritBadge, AslStatusBadge } from "./asl-badges";

type AslOverviewPanelProps = {
  onOpenSupplier: (id: string) => void;
  onNotify: (ids: string[]) => void;
  onJumpView: (view: "documents" | "evaluations" | "asl") => void;
};

export function AslOverviewPanel({
  onOpenSupplier,
  onNotify,
  onJumpView,
}: AslOverviewPanelProps) {
  const overviewQuery = useAslOverviewQuery();
  const data = overviewQuery.data;

  if (overviewQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
        <Loader2 className="size-4 animate-spin" /> Loading overview…
      </div>
    );
  }

  if (!data) {
    return (
      <EmptyState
        title="Overview unavailable"
        description="Could not load ASL overview. Try refreshing the page."
      />
    );
  }

  const { totals, attention, readiness } = data;
  const expiringIds = [
    ...new Set(
      attention
        .filter((a) => a.issue.k === "expired" || a.issue.k === "soon")
        .map((a) => a.supplierId)
    ),
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Live suppliers",
            value: totals.live,
            onClick: () => onJumpView("asl"),
          },
          {
            label: "Critical",
            value: totals.critical,
            onClick: () => onJumpView("asl"),
          },
          {
            label: "Approved / Conditional",
            value: `${totals.approved} / ${totals.conditional}`,
            onClick: () => onJumpView("asl"),
          },
          {
            label: "Docs expiring",
            value: totals.docsExpiring,
            onClick: () => onJumpView("documents"),
          },
          {
            label: "Evaluations due",
            value: totals.evaluationsDue,
            onClick: () => onJumpView("evaluations"),
          },
          {
            label: "Chased this month",
            value: totals.chasedThisMonth,
          },
        ].map((card) => (
          <button
            key={card.label}
            type="button"
            disabled={!card.onClick}
            onClick={card.onClick}
            className="rounded-lg border border-border-subtle bg-card px-4 py-3 text-left transition-colors hover:bg-muted/40 disabled:pointer-events-none"
          >
            <p className="ims-text-meta">{card.label}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">
              {card.value}
            </p>
          </button>
        ))}
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold">Needs attention</h2>
            <p className="ims-text-meta">As of {data.asOf}</p>
          </div>
          {expiringIds.length ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onNotify(expiringIds)}
            >
              <Mail className="size-3.5" />
              Notify all with expiring docs
            </Button>
          ) : null}
        </div>

        {attention.length === 0 ? (
          <EmptyState
            title="Nothing outstanding"
            description="No missing documents, overdue evaluations, or low scores right now."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border-subtle">
            <table className="ims-table w-full text-sm">
              <thead>
                <tr>
                  <th>Supplier</th>
                  <th>Issue</th>
                  <th>Status</th>
                  <th className="w-[1%]" />
                </tr>
              </thead>
              <tbody>
                {attention.map((row, i) => (
                  <tr key={`${row.supplierId}-${row.issue.k}-${i}`}>
                    <td>
                      <div className="font-medium">{row.name}</div>
                      <div className="ims-text-meta flex flex-wrap gap-1">
                        <AslCritBadge crit={row.crit} />
                        <span>{row.cat}</span>
                      </div>
                    </td>
                    <td>{row.issue.t}</td>
                    <td>
                      <AslStatusBadge status={row.status} />
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => onOpenSupplier(row.supplierId)}
                        >
                          <ExternalLink className="size-3.5" />
                          Open
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => onNotify([row.supplierId])}
                        >
                          <Mail className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Audit readiness</h2>
        <ul className="space-y-2">
          {readiness.map((item) => (
            <li
              key={item.label}
              className="flex items-start gap-3 rounded-md border border-border-subtle px-3 py-2.5 text-sm"
            >
              <span
                className={
                  item.pass
                    ? "mt-0.5 size-2 shrink-0 rounded-full bg-emerald-500"
                    : "mt-0.5 size-2 shrink-0 rounded-full bg-amber-500"
                }
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{item.label}</p>
                <p className="ims-text-meta">
                  {item.detail} · clause {item.clause}
                </p>
              </div>
              <span className="ims-text-meta shrink-0">
                {item.pass ? "Pass" : "Gap"}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
