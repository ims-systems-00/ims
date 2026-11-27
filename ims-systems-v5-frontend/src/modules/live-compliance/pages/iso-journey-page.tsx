import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, ChevronDown } from "lucide-react";
import { PageLoader } from "@/shared/components/ims-loader";
import { Button } from "@/shared/components/ui/button";
import { PageHeader } from "@/shared/layout";
import { isApiClientError } from "@/shared/lib/http/errors";
import { notify } from "@/shared/lib/toast";
import { cn } from "@/shared/lib/utils";
import { AskAliceButton } from "../components/alice-task-sheet";
import { HealthRing } from "../components/health-ring";
import { useJourneyQuery, useSetJourneyStepMutation } from "../hooks/use-alice";
import { HEALTH_DOT_CLASS, HEALTH_LABELS } from "../lib/health";
import { LIVE_MODULE_NAMES, type JourneyStep } from "../types";

function StepRow({
  step,
  open,
  onToggle,
}: {
  step: JourneyStep;
  open: boolean;
  onToggle: () => void;
}) {
  const setStep = useSetJourneyStepMutation();
  const done = step.status === "done";
  const clauseLabel = step.clauses[0] === "all" ? "All clauses" : `ISO ${step.clauses.join(", ")}`;

  return (
    <li className={cn("rounded-xl border bg-card", step.status === "now" ? "border-primary/40" : "border-border-subtle")}>
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span
          aria-hidden
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
            done ? "bg-success/15 text-success" : step.status === "now" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          )}
        >
          {done ? <Check className="size-3.5" /> : step.index + 1}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-foreground">{step.title}</span>
          <span className="block text-xs text-muted-foreground">
            {clauseLabel} · {LIVE_MODULE_NAMES[step.module]}
          </span>
        </span>
        <span className="text-xs text-muted-foreground">
          {done ? (step.auto ? "Done (clauses in place)" : "Done") : step.status === "now" ? "Next" : ""}
        </span>
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open ? (
        <div className="space-y-3 border-t border-border-subtle px-4 py-3 text-sm">
          <p>
            <span className="font-medium text-foreground">What it asks: </span>
            <span className="text-muted-foreground">{step.asks}</span>
          </p>
          <p>
            <span className="font-medium text-foreground">Good evidence: </span>
            <span className="text-muted-foreground">{step.evidence}</span>
          </p>
          {step.clauseStates.length ? (
            <ul aria-label="Clause status" className="flex flex-wrap gap-1.5">
              {step.clauseStates.map((c) => (
                <li
                  key={`${c.standard}-${c.clause}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle px-2.5 py-0.5 text-xs"
                >
                  <span aria-hidden className={cn("size-1.5 rounded-full", HEALTH_DOT_CLASS[c.status])} />
                  <span className="font-medium tabular-nums">{c.clause}</span>
                  <span className="text-muted-foreground">
                    {c.standard.replace("ISO ", "")} · {HEALTH_LABELS[c.status]}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild size="sm" variant="outline" className="h-7 rounded-full px-3 text-xs">
              <Link to={step.href}>Open {LIVE_MODULE_NAMES[step.module]}</Link>
            </Button>
            {step.clauses[0] === "all" ? (
              <AskAliceButton task="gap_analysis" refId={null} label="Run a gap analysis" />
            ) : (
              <AskAliceButton task="explain_clause" refId={step.clauses.join(",")} label="Explain with ALICE" />
            )}
            {!step.auto ? (
              <Button
                type="button"
                size="sm"
                variant={done ? "ghost" : "default"}
                className="ml-auto h-7 rounded-full px-3 text-xs"
                disabled={setStep.isPending}
                onClick={() =>
                  setStep.mutate(
                    { step: step.id, done: !done },
                    { onError: (error) => notify.fromError(error, "Unable to update the step") }
                  )
                }
              >
                {done ? "Mark not done" : "Mark step done"}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </li>
  );
}

/**
 * "Get ready for ISO" at `/compliance/journey`: 12 steps from scope to a
 * certification readiness check. Steps tick themselves off as their clauses
 * reach Implemented or better; people can also mark a step done.
 */
export function IsoJourneyPage() {
  const query = useJourneyQuery();
  const [openId, setOpenId] = useState<string | null>(null);
  const data = query.data;
  const current = data?.steps.find((s) => s.status === "now")?.id ?? null;
  const expanded = openId ?? current;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        title="Get ready for ISO"
        description="A step-by-step path for organisations new to ISO. Each step sets up a module and moves its clauses towards Implemented."
      />
      {query.isLoading ? <PageLoader label="Loading your progress…" /> : null}
      {query.isError ? (
        <p className="ims-alert ims-alert-error" role="alert">
          {isApiClientError(query.error) ? query.error.message : "Unable to load the journey."}
        </p>
      ) : null}
      {data ? (
        <>
          <div className="flex items-center gap-5 rounded-xl border border-border-subtle bg-card px-5 py-4">
            <HealthRing
              percentage={Math.round((data.done / data.total) * 100)}
              worst={data.done === data.total ? "sus" : "prog"}
              size={64}
              thickness={4}
            />
            <div>
              <p className="text-sm font-medium text-foreground">
                {data.done === data.total
                  ? "All 12 steps done. You are in sustain mode."
                  : `${data.done} of ${data.total} steps done`}
              </p>
              <p className="text-xs text-muted-foreground">
                {data.next
                  ? `Next: ${data.next}`
                  : "Advice and notifications now keep you compliant day to day."}
              </p>
            </div>
          </div>
          <ol className="space-y-2" aria-label="Steps">
            {data.steps.map((step) => (
              <StepRow
                key={step.id}
                step={step}
                open={expanded === step.id}
                onToggle={() => setOpenId(expanded === step.id ? "" : step.id)}
              />
            ))}
          </ol>
        </>
      ) : null}
    </div>
  );
}
