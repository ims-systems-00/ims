import { useNavigate } from "react-router-dom";
import { BellOff, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/toast";
import { cn } from "@/shared/lib/utils";
import {
  useRunAdviceActionMutation,
  useSnoozeAdviceMutation,
} from "../hooks/use-live-compliance";
import { ACTION_BUCKET_LABELS, actionMeta } from "../lib/action-centre";
import { SEVERITY_DOT_CLASS, SEVERITY_LABELS } from "../lib/health";
import {
  type ActionBucket,
  type ActionCentreItem,
  type ActionCentreResponse,
} from "../types";
import { HealthRing } from "./health-ring";
import { useAliceSheetStore } from "../lib/alice-store";
import type { AliceTaskId } from "../types";

/** Audit readiness per standard: a small ring and the percentage. */
export function ReadinessStrip({
  readiness,
  className,
}: {
  readiness: ActionCentreResponse["readiness"];
  className?: string;
}) {
  if (!readiness.length) return null;
  return (
    <ul aria-label="Audit readiness" className={cn("flex flex-wrap gap-2", className)}>
      {readiness.map((r) => (
        <li
          key={r.standard}
          className="flex items-center gap-2.5 rounded-lg border border-border-subtle px-2.5 py-1.5"
        >
          <HealthRing percentage={r.percentage} worst={r.worst} size={34} thickness={3} label={false} />
          <span className="leading-tight">
            <span className="block text-xs font-medium text-foreground">{r.standard}</span>
            <span className="block text-[0.6875rem] text-muted-foreground">
              {r.percentage}% audit-ready
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function ActionRow({
  item,
  onNavigate,
}: {
  item: ActionCentreItem;
  onNavigate?: () => void;
}) {
  const navigate = useNavigate();
  const runAction = useRunAdviceActionMutation();
  const snooze = useSnoozeAdviceMutation();
  const openAlice = useAliceSheetStore((s) => s.open);
  const busy = runAction.isPending || snooze.isPending;

  function onAction() {
    if (item.action.type === "navigate") {
      onNavigate?.();
      navigate(item.action.href);
      return;
    }
    runAction.mutate(item.id, {
      onSuccess: (result) => notify.success(result.message),
      onError: (error) => notify.fromError(error, "Unable to complete this action"),
    });
  }

  return (
    <li
      aria-label={item.title}
      title={item.why}
      className="group flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/40"
    >
      <span
        aria-hidden
        className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", SEVERITY_DOT_CLASS[item.severity])}
      />
      <span className="sr-only">{SEVERITY_LABELS[item.severity]} priority. </span>
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="line-clamp-2 text-[0.8125rem] font-medium leading-snug text-foreground">
          {item.title}
        </p>
        <p className="truncate text-[0.6875rem] text-muted-foreground">{actionMeta(item)}</p>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        {item.offer ? (
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            className="size-7 text-primary"
            aria-label={`Ask ALICE: ${item.offer.label}`}
            title={item.offer.label}
            onClick={() => {
              onNavigate?.();
              openAlice({
                kind: "run",
                task: item.offer!.task as AliceTaskId,
                ref: item.offer!.ref ?? null,
                label: item.offer!.label,
              });
            }}
          >
            <Sparkles className="size-3.5" />
          </Button>
        ) : null}
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="size-7 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          aria-label="Snooze"
          title="Snooze for 7 days"
          disabled={busy}
          onClick={() =>
            snooze.mutate(
              { id: item.id, days: 7 },
              {
                onSuccess: () => notify.info("Snoozed for 7 days"),
                onError: (error) => notify.fromError(error, "Unable to snooze"),
              }
            )
          }
        >
          <BellOff className="size-3.5" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 rounded-full px-3 text-xs"
          onClick={onAction}
          disabled={busy}
        >
          {runAction.isPending ? "Working…" : item.action.label}
        </Button>
      </div>
    </li>
  );
}

/**
 * Grouped action list (Overdue / Due this week / Coming up). Used by the
 * navbar action centre and the daily sign-in summary.
 */
export function ActionCentreList({
  items,
  buckets = ["now", "week", "later"],
  limit,
  onNavigate,
  className,
}: {
  items: ActionCentreItem[];
  buckets?: ActionBucket[];
  /** Cap rows across groups (most urgent first). */
  limit?: number;
  onNavigate?: () => void;
  className?: string;
}) {
  let remaining = limit ?? Number.POSITIVE_INFINITY;
  const groups = buckets
    .map((bucket) => {
      const rows = items.filter((i) => i.bucket === bucket);
      const shown = rows.slice(0, Math.max(0, remaining));
      remaining -= shown.length;
      return { bucket, rows: shown, total: rows.length };
    })
    .filter((g) => g.rows.length);

  if (!groups.length) {
    return (
      <div className={cn("flex flex-col items-center gap-2 py-8 text-center", className)}>
        <CheckCircle2 className="size-6 text-success" aria-hidden />
        <p className="text-sm font-medium text-foreground">You're all caught up</p>
        <p className="text-xs text-muted-foreground">Nothing needs your attention right now.</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {groups.map((group) => (
        <section key={group.bucket} aria-label={ACTION_BUCKET_LABELS[group.bucket]}>
          <h3 className="mb-1 flex items-center gap-2 px-2 text-[0.6875rem] font-medium uppercase tracking-wide text-muted-foreground">
            {ACTION_BUCKET_LABELS[group.bucket]}
            <span className="tabular-nums">{group.total}</span>
          </h3>
          <ul className="space-y-0.5">
            {group.rows.map((item) => (
              <ActionRow key={item.id} item={item} onNavigate={onNavigate} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
