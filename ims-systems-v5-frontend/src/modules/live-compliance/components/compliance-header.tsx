import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { HEALTH_DOT_CLASS, HEALTH_LABELS, healthHeadline } from "../lib/health";
import { useModuleHealthQuery } from "../hooks/use-live-compliance";
import type { LiveClause, LiveModule } from "../types";
import { HealthRing } from "./health-ring";
import { AskAliceButton } from "./alice-task-sheet";

const RANK = { lapsed: 0, risk: 1, prog: 2, not: 3, impl: 4, sus: 5 } as const;

/** One entry per clause number, showing the worst status across standards. */
function worstPerClause(clauses: LiveClause[]): LiveClause[] {
  const map = new Map<string, LiveClause>();
  for (const c of clauses) {
    const current = map.get(c.clause);
    if (!current || RANK[c.status] < RANK[current.status]) map.set(c.clause, c);
  }
  return [...map.values()].sort((a, b) =>
    a.clause.localeCompare(b.clause, undefined, { numeric: true })
  );
}

/** True for a moment after `value` changes (not on first render). */
function useFlashOnChange(value: string, durationMs = 1_600): boolean {
  const previous = useRef(value);
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (previous.current === value) return;
    previous.current = value;
    setFlash(true);
    const timer = setTimeout(() => setFlash(false), durationMs);
    return () => clearTimeout(timer);
  }, [value, durationMs]);
  return flash;
}

function ClausePill({ clause }: { clause: LiveClause }) {
  // Live stream updates re-render with a new status: highlight briefly.
  const flash = useFlashOnChange(clause.status);
  return (
    <li
      title={clause.detail}
      data-flash={flash || undefined}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs transition-colors duration-700",
        flash ? "border-primary/40 bg-primary/10" : "border-border-subtle"
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", HEALTH_DOT_CLASS[clause.status])} />
      <span className="font-medium tabular-nums text-foreground">{clause.clause}</span>
      <span className="text-muted-foreground">{clause.title}</span>
      <span className="sr-only">: {HEALTH_LABELS[clause.status]}</span>
    </li>
  );
}

/**
 * Summary card: circular progress for "compliant today", a one-line
 * headline and a quiet tag per clause (live evidence in the tooltip).
 */
export function ComplianceHeader({
  module,
  className,
}: {
  module: LiveModule;
  className?: string;
}) {
  const query = useModuleHealthQuery(module);
  const data = query.data;
  if (!data || !data.clauses.length) return null;
  const clauses = worstPerClause(data.clauses);

  return (
    <div
      className={cn(
        "flex items-center gap-5 rounded-xl border border-border-subtle bg-card px-5 py-4",
        className
      )}
    >
      <HealthRing percentage={data.percentage} worst={data.worst} size={60} thickness={4} />
      <div className="min-w-0 flex-1 space-y-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">ISO compliance</p>
            <p className="text-sm font-medium text-foreground">
              {healthHeadline(data.worst, data.clauses.length)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
          <AskAliceButton
            task="explain_clause"
            refId={clauses.map((c) => c.clause).join(",")}
            label="Explain these clauses"
            className="h-6 gap-1 rounded-full px-2 text-xs text-primary hover:text-primary"
          />
          <Link
            to="/compliance/live"
            aria-label="Open live compliance overview"
            className="inline-flex shrink-0 items-center gap-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Overview
            <ArrowUpRight className="size-3" />
          </Link>
          </div>
        </div>
        <ul className="flex flex-wrap gap-1.5" aria-label="Clauses">
          {clauses.map((c) => (
            <ClausePill key={c.clause} clause={c} />
          ))}
        </ul>
      </div>
    </div>
  );
}
