import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  FileWarning,
  Mail,
  Shield,
  Users,
} from "lucide-react";
import { EmptyState } from "@/shared/components/empty-state";
import { EntityTableRow } from "@/shared/components/entity-table-row";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { useAslOverviewQuery } from "../hooks/use-asl-supplier";
import { AslCritBadge, AslStatusBadge } from "./asl-badges";
import { PageLoader } from "@/shared/components/ims-loader";

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
      <PageLoader label="Loading overview…" />
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
  const attentionPreview = attention.slice(0, 3);
  const expiringIds = [
    ...new Set(
      attention
        .filter((a) => a.issue.k === "expired" || a.issue.k === "soon")
        .map((a) => a.supplierId)
    ),
  ];
  const passCount = readiness.filter((item) => item.pass).length;
  const gapCount = readiness.length - passCount;

  const cards = [
    {
      label: "Live suppliers",
      value: totals.live,
      icon: Users,
      tone: "primary" as const,
      onClick: () => onJumpView("asl"),
    },
    {
      label: "Critical",
      value: totals.critical,
      icon: Shield,
      tone: "warn" as const,
      onClick: () => onJumpView("asl"),
    },
    {
      label: "Approved / Conditional",
      value: `${totals.approved} / ${totals.conditional}`,
      icon: CheckCircle2,
      tone: "ok" as const,
      onClick: () => onJumpView("asl"),
    },
    {
      label: "Docs expiring",
      value: totals.docsExpiring,
      icon: FileWarning,
      tone: totals.docsExpiring > 0 ? ("danger" as const) : ("muted" as const),
      onClick: () => onJumpView("documents"),
    },
    {
      label: "Evaluations due",
      value: totals.evaluationsDue,
      icon: ClipboardList,
      tone:
        totals.evaluationsDue > 0 ? ("warn" as const) : ("muted" as const),
      onClick: () => onJumpView("evaluations"),
    },
    {
      label: "Chased this month",
      value: totals.chasedThisMonth,
      icon: Mail,
      tone: "muted" as const,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.label}
              type="button"
              disabled={!card.onClick}
              onClick={card.onClick}
              className={cn(
                "group relative overflow-hidden rounded-xl border border-border-subtle bg-card px-4 py-4 text-left transition-all",
                card.onClick &&
                  "hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm",
                "disabled:pointer-events-none"
              )}
            >
              <span
                className={cn(
                  "absolute inset-y-0 left-0 w-1",
                  card.tone === "primary" && "bg-primary",
                  card.tone === "ok" && "bg-emerald-500",
                  card.tone === "warn" && "bg-amber-500",
                  card.tone === "danger" && "bg-destructive",
                  card.tone === "muted" && "bg-border"
                )}
              />
              <div className="flex items-start justify-between gap-3 pl-2">
                <div>
                  <p className="ims-text-meta">{card.label}</p>
                  <p className="mt-1.5 text-2xl font-semibold tracking-tight">
                    {card.value}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-lg p-2 text-muted-foreground transition-colors group-hover:text-foreground",
                    card.tone === "primary" && "bg-primary/10 text-primary",
                    card.tone === "ok" && "bg-emerald-500/10 text-emerald-600",
                    card.tone === "warn" && "bg-amber-500/10 text-amber-600",
                    card.tone === "danger" &&
                      "bg-destructive/10 text-destructive",
                    card.tone === "muted" && "bg-muted"
                  )}
                >
                  <Icon className="size-4" />
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-500" />
              <h2 className="text-sm font-semibold">Needs attention</h2>
            </div>
            <p className="ims-text-meta">
              As of {data.asOf}
              {attention.length
                ? attention.length > 3
                  ? ` · top 3 of ${attention.length} items`
                  : ` · ${attention.length} item${attention.length === 1 ? "" : "s"}`
                : ""}
            </p>
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
          <div className="rounded-xl border border-dashed border-border-subtle bg-muted/20 px-4 py-8 text-center">
            <CheckCircle2 className="mx-auto size-8 text-emerald-500" />
            <p className="mt-3 text-sm font-medium">Nothing outstanding</p>
            <p className="ims-text-meta mt-1">
              No missing documents, overdue evaluations, or low scores right now.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border-subtle">
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
                {attentionPreview.map((row, i) => (
                  <EntityTableRow
                    key={`${row.supplierId}-${row.issue.k}-${i}`}
                    onOpen={() => onOpenSupplier(row.supplierId)}
                  >
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
                  </EntityTableRow>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <Shield className="size-4 text-primary" />
              <h2 className="text-sm font-semibold">Audit readiness</h2>
            </div>
            <p className="ims-text-meta">
              Live Pass / Gap against your current ASL data
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 font-medium text-emerald-700 dark:text-emerald-400">
              {passCount} Pass
            </span>
            <span className="rounded-full bg-amber-500/10 px-2.5 py-1 font-medium text-amber-700 dark:text-amber-400">
              {gapCount} Gap
            </span>
          </div>
        </div>
        <ul className="grid gap-2">
          {readiness.map((item) => (
            <li
              key={item.label}
              className={cn(
                "flex items-start gap-3 rounded-xl border px-3.5 py-3 text-sm transition-colors",
                item.pass
                  ? "border-emerald-500/20 bg-emerald-500/[0.04]"
                  : "border-amber-500/25 bg-amber-500/[0.04]"
              )}
            >
              {item.pass ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
              ) : (
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium">{item.label}</p>
                <p className="ims-text-meta mt-0.5">
                  {item.detail} · clause {item.clause}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold",
                  item.pass
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                    : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                )}
              >
                {item.pass ? "Pass" : "Gap"}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
