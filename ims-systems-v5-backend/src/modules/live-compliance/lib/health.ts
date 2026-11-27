/**
 * Health roll-ups: per-standard totals, percentage and worst status.
 */

import type {
  ClauseHealthStatus,
  LiveClause,
  LiveStandard,
  StandardHealth,
} from "../types";

/** Severity order used to pick the "worst" status (drives ring colours). */
const WORST_RANK: Record<ClauseHealthStatus, number> = {
  lapsed: 0,
  risk: 1,
  prog: 2,
  not: 3,
  impl: 4,
  sus: 5,
};

export function worstStatus(statuses: ClauseHealthStatus[]): ClauseHealthStatus {
  if (!statuses.length) return "not";
  return statuses.reduce((worst, s) =>
    WORST_RANK[s] < WORST_RANK[worst] ? s : worst
  );
}

/** Statuses that count as "compliant today". */
export function isCompliantToday(status: ClauseHealthStatus): boolean {
  return status === "sus" || status === "impl" || status === "risk";
}

export function percentageOf(statuses: ClauseHealthStatus[]): number {
  if (!statuses.length) return 0;
  return Math.round(
    (statuses.filter(isCompliantToday).length / statuses.length) * 100
  );
}

export function summariseStandard(
  standard: LiveStandard,
  clauses: LiveClause[]
): StandardHealth {
  const statuses = clauses
    .filter((c) => c.standard === standard)
    .map((c) => c.status);
  const count = (s: ClauseHealthStatus) => statuses.filter((x) => x === s).length;
  return {
    standard,
    total: statuses.length,
    sustained: count("sus"),
    implemented: count("impl"),
    atRisk: count("risk"),
    lapsed: count("lapsed"),
    inProgress: count("prog"),
    notStarted: count("not"),
    percentage: percentageOf(statuses),
    worst: worstStatus(statuses),
  };
}

/** Map the manual toolkit state onto a health status (non-live clauses). */
export function manualStateToHealth(state: string): ClauseHealthStatus {
  if (state === "Implemented" || state === "Yes") return "impl";
  if (state === "Partially implemented") return "prog";
  return "not";
}
