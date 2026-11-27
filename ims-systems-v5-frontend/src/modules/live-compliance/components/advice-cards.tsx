import { useNavigate } from "react-router-dom";
import { BellOff } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/toast";
import { cn } from "@/shared/lib/utils";
import {
  useAdviceQuery,
  useRunAdviceActionMutation,
  useSnoozeAdviceMutation,
} from "../hooks/use-live-compliance";
import { SEVERITY_DOT_CLASS, SEVERITY_LABELS, formatDay } from "../lib/health";
import { LIVE_MODULE_NAMES, type AdviceItem, type AliceTaskId, type LiveModule } from "../types";
import { AskAliceButton } from "./alice-task-sheet";

type AdviceCardsProps = {
  module?: LiveModule;
  limit?: number;
  /** Text shown when nothing needs attention (null hides the empty state). */
  emptyText?: string | null;
  className?: string;
};

/**
 * "Do next" list: the most important things to stay compliant, one row
 * each with a single action. Severity is a dot; the reasoning is in the
 * row tooltip to keep the list quiet.
 */
export function AdviceCards({
  module,
  limit = 3,
  emptyText = "Nothing needs attention right now.",
  className,
}: AdviceCardsProps) {
  const query = useAdviceQuery(module, limit);
  if (query.isLoading || query.isError || !query.data) return null;
  const items = query.data.items;

  if (!items.length) {
    if (emptyText === null) return null;
    return <p className={cn("text-[0.8125rem] text-muted-foreground", className)}>{emptyText}</p>;
  }

  return (
    <ul
      className={cn("grid gap-3 sm:grid-cols-2 xl:grid-cols-3", className)}
      aria-label="Do next"
    >
      {items.map((item) => (
        <AdviceCard key={item.id} item={item} showModule={!module} />
      ))}
    </ul>
  );
}

function AdviceCard({ item, showModule }: { item: AdviceItem; showModule: boolean }) {
  const navigate = useNavigate();
  const runAction = useRunAdviceActionMutation();
  const snooze = useSnoozeAdviceMutation();
  const busy = runAction.isPending || snooze.isPending;

  function onAction() {
    if (item.action.type === "navigate") {
      navigate(item.action.href);
      return;
    }
    runAction.mutate(item.id, {
      onSuccess: (result) => notify.success(result.message),
      onError: (error) => notify.fromError(error, "Unable to complete this action"),
    });
  }

  const meta = [showModule ? LIVE_MODULE_NAMES[item.module] : null, item.clause ? `ISO ${item.clause}` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <li
      aria-label={item.title}
      title={item.why}
      className="group flex flex-col gap-3 rounded-xl border border-border-subtle bg-card p-4 transition-colors hover:border-border"
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span aria-hidden className={cn("size-1.5 rounded-full", SEVERITY_DOT_CLASS[item.severity])} />
        <span className="sr-only">{SEVERITY_LABELS[item.severity]} priority. </span>
        <span>{item.due ? `Due ${formatDay(item.due)}` : SEVERITY_LABELS[item.severity] + " priority"}</span>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="-my-1 -mr-1.5 ml-auto size-6 text-muted-foreground opacity-60 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
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
      </div>
      <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground">{item.title}</p>
      {item.offer ? (
        <AskAliceButton
          task={item.offer.task as AliceTaskId}
          refId={item.offer.ref}
          label={item.offer.label}
          className="-ml-2 h-6 max-w-full justify-start gap-1 px-2 text-xs text-primary hover:text-primary"
        />
      ) : null}
      <div className="mt-auto flex items-center justify-between gap-2">
        <span className="truncate text-xs text-muted-foreground">{meta}</span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 shrink-0 rounded-full px-3 text-xs"
          onClick={onAction}
          disabled={busy}
        >
          {runAction.isPending ? "Working…" : item.action.label}
        </Button>
      </div>
    </li>
  );
}
