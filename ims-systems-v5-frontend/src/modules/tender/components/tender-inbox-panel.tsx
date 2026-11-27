import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  FileText,
  Plus,
  Upload,
} from "lucide-react";
import { EmptyState } from "@/shared/components/empty-state";
import { EntityTableRow } from "@/shared/components/entity-table-row";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import {
  useTenderHealthQuery,
  useTenderOverviewQuery,
  useTenderQuestionnairesQuery,
} from "../hooks/use-tender";
import { formatDate, formatWhen } from "../lib/tender-display";
import { TenderQuestionnaireStatusBadge } from "./tender-badges";
import { PageLoader } from "@/shared/components/ims-loader";

type TenderInboxPanelProps = {
  onOpenQuestionnaire: (id: string) => void;
  onImport: () => void;
  onNewTender: () => void;
  canCreate?: boolean;
};

export function TenderInboxPanel({
  onOpenQuestionnaire,
  onImport,
  onNewTender,
  canCreate = true,
}: TenderInboxPanelProps) {
  const overviewQuery = useTenderOverviewQuery();
  const healthQuery = useTenderHealthQuery();
  const listQuery = useTenderQuestionnairesQuery();

  const stats = overviewQuery.data;
  const health = healthQuery.data;
  const items = listQuery.data ?? [];

  if (overviewQuery.isLoading && listQuery.isLoading) {
    return (
      <PageLoader label="Loading inbox…" />
    );
  }

  const libraryIssues =
    (health?.stale.length ?? 0) +
    (health?.certsExpired.length ?? 0) +
    (health?.certsExpiring.length ?? 0) +
    (health?.policiesOverdue.length ?? 0);

  const cards = [
    {
      label: "Open bids",
      value: stats?.open ?? 0,
      icon: FileText,
      tone: "primary" as const,
    },
    {
      label: "Due soon",
      value: stats?.dueSoon ?? 0,
      icon: AlertTriangle,
      tone: (stats?.dueSoon ?? 0) > 0 ? ("warn" as const) : ("muted" as const),
    },
    {
      label: "Questions",
      value: stats?.questions ?? 0,
      icon: ClipboardList,
      tone: "muted" as const,
    },
    {
      label: "Approved",
      value: stats?.approved ?? 0,
      icon: CheckCircle2,
      tone: "ok" as const,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Inbox</h2>
          <p className="text-sm text-muted-foreground">
            Active questionnaires and tenders — create a tender or import a questionnaire to start drafting.
          </p>
        </div>
        {canCreate ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={onImport}>
              <Upload className="size-3.5" />
              Import questionnaire
            </Button>
            <Button type="button" size="sm" onClick={onNewTender}>
              <Plus className="size-3.5" />
              New tender
            </Button>
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={cn(
                "rounded-xl border border-border-subtle bg-card p-4",
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
            </div>
          );
        })}
      </div>

      {libraryIssues > 0 && health ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm">
          <div className="font-medium">Library needs attention</div>
          <p className="mt-0.5 text-muted-foreground">
            {[
              health.stale.length
                ? `${health.stale.length} stale answer(s)`
                : null,
              health.certsExpired.length
                ? `${health.certsExpired.length} expired certificate(s)`
                : null,
              health.certsExpiring.length
                ? `${health.certsExpiring.length} certificate(s) expiring soon`
                : null,
              health.policiesOverdue.length
                ? `${health.policiesOverdue.length} policy review(s) overdue`
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      ) : null}

      {listQuery.isLoading ? (
        <PageLoader label="Loading questionnaires…" compact className="py-6" />
      ) : items.length === 0 ? (
        <EmptyState
          title="No questionnaires yet"
          description="Create a tender and upload its pack, or import an xlsx, docx, csv or pasted questionnaire."
          action={
            canCreate ? (
              <div className="flex flex-wrap justify-center gap-2">
                <Button type="button" variant="outline" onClick={onImport}>
                  <Upload className="size-3.5" />
                  Import questionnaire
                </Button>
                <Button type="button" onClick={onNewTender}>
                  <Plus className="size-3.5" />
                  New tender
                </Button>
              </div>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border-subtle bg-card">
          <table className="ims-table w-full">
            <thead>
              <tr>
                <th>Buyer / title</th>
                <th>Due</th>
                <th>Status</th>
                <th>Questions</th>
                <th>Received</th>
              </tr>
            </thead>
            <tbody>
              {items.map((q) => (
                <EntityTableRow
                  key={q.id}
                  onOpen={() => onOpenQuestionnaire(q.id)}
                >
                  <td>
                    <div className="flex items-center gap-2 font-medium">
                      {q.buyer || "Untitled buyer"}
                      {q.kind === "tender" ? (
                        <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                          Tender
                        </span>
                      ) : null}
                    </div>
                    <div className="ims-text-meta">
                      {q.title || q.reference || q.id}
                    </div>
                  </td>
                  <td>{formatDate(q.due)}</td>
                  <td>
                    <TenderQuestionnaireStatusBadge status={q.status} />
                  </td>
                  <td>
                    {q.questions?.length ?? 0}
                    {stats ? (
                      <span className="ims-text-meta">
                        {" "}
                        · {q.questions?.filter((x) => x.status === "approved").length ?? 0}{" "}
                        approved
                      </span>
                    ) : null}
                  </td>
                  <td className="text-muted-foreground">
                    {formatWhen(q.received)}
                  </td>
                </EntityTableRow>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
