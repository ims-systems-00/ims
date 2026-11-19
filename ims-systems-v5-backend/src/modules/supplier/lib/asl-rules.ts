/**
 * Pure ASL business rules — ported from the HTML prototype.
 */

import type {
  AslCriticality,
  AslCriterion,
  AslDocument,
  AslDocState,
  AslEvaluation,
  AslIssue,
  AslSettings,
  AslStatus,
  AslSupplier,
  AslTrailEntry,
} from "../types";

export const REQ: Record<AslCriticality, string[]> = {
  Critical: [
    "Insurance (PL/EL)",
    "ISO certificate|SSIP (CHAS/SafeContractor)|UKAS schedule|Cyber Essentials",
    "Signed requirements / T&Cs",
  ],
  High: [
    "Insurance (PL/EL)",
    "Signed requirements / T&Cs|Data processing agreement",
  ],
  Standard: ["Insurance (PL/EL)"],
};

export const CATREQ: Record<string, string[]> = {
  "Contractor on site": [
    "Insurance (PL/EL)",
    "RAMS",
    "SSIP (CHAS/SafeContractor)|Competence / trade card",
    "Signed requirements / T&Cs",
  ],
  "IT / data processor": [
    "Insurance (PL/EL)",
    "Data processing agreement",
    "Cyber Essentials|ISO certificate",
  ],
};

export function startOfToday(now = new Date()): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function addMonths(d: Date, n: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

export function daysUntil(dateIso: string, today = startOfToday()): number {
  const target = new Date(dateIso);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function requiredDocs(supplier: Pick<AslSupplier, "crit" | "cat">): string[] {
  const set = new Set(REQ[supplier.crit] ?? REQ.Standard);
  for (const r of CATREQ[supplier.cat] ?? []) set.add(r);
  return [...set];
}

export function docState(
  doc: Pick<AslDocument, "exp">,
  leadDays: number,
  today = startOfToday()
): AslDocState {
  if (!doc.exp) return "missing";
  const n = daysUntil(doc.exp, today);
  if (n < 0) return "expired";
  if (n <= leadDays) return "soon";
  return "ok";
}

export function missingDocs(
  supplier: Pick<AslSupplier, "crit" | "cat" | "docs">,
  leadDays: number,
  today = startOfToday()
): string[] {
  return requiredDocs(supplier).filter((r) => {
    const alts = r.split("|");
    return !supplier.docs.some(
      (d) => alts.includes(d.type) && docState(d, leadDays, today) !== "missing"
    );
  });
}

export function expiredDocs(
  supplier: Pick<AslSupplier, "docs">,
  leadDays: number,
  today = startOfToday()
): AslDocument[] {
  return supplier.docs.filter((d) => docState(d, leadDays, today) === "expired");
}

export function soonDocs(
  supplier: Pick<AslSupplier, "docs">,
  leadDays: number,
  today = startOfToday()
): AslDocument[] {
  return supplier.docs.filter((d) => docState(d, leadDays, today) === "soon");
}

export function weightedScore(
  scores: Record<string, number>,
  criteria: AslCriterion[]
): number | null {
  let total = 0;
  let weight = 0;
  for (const c of criteria) {
    const v = scores[c.k];
    if (typeof v === "number" && Number.isFinite(v)) {
      total += v * c.w;
      weight += c.w;
    }
  }
  if (!weight) return null;
  return Number((total / weight).toFixed(1));
}

export function lastEval(
  supplier: Pick<AslSupplier, "evals">
): AslEvaluation | null {
  if (!supplier.evals.length) return null;
  return [...supplier.evals].sort((a, b) => (a.date < b.date ? 1 : -1))[0] ?? null;
}

export function nextEvalDate(
  supplier: Pick<AslSupplier, "evals" | "appon" | "crit">,
  interval: Record<AslCriticality, number>
): string | null {
  const last = lastEval(supplier);
  const base = last
    ? new Date(last.date)
    : supplier.appon
      ? new Date(supplier.appon)
      : null;
  if (!base || Number.isNaN(base.getTime())) return null;
  const months = interval[supplier.crit] ?? 12;
  return toIsoDate(addMonths(base, months));
}

export function collectIssues(
  supplier: AslSupplier,
  settings: Pick<AslSettings, "lead" | "interval" | "criteria">,
  today = startOfToday()
): AslIssue[] {
  const out: AslIssue[] = [];
  if (supplier.status === "Removed") return out;

  for (const d of expiredDocs(supplier, settings.lead, today)) {
    out.push({
      k: "expired",
      t: `${d.type} expired ${d.exp}`,
      docId: d.id,
    });
  }
  for (const r of missingDocs(supplier, settings.lead, today)) {
    out.push({
      k: "missing",
      t: `${r.replace(/\|/g, " or ")} not on file`,
    });
  }
  for (const d of soonDocs(supplier, settings.lead, today)) {
    out.push({
      k: "soon",
      t: `${d.type} expires ${d.exp} (${daysUntil(d.exp!, today)} days)`,
      docId: d.id,
    });
  }

  const next = nextEvalDate(supplier, settings.interval);
  if (supplier.status !== "Prospective") {
    if (!lastEval(supplier)) {
      out.push({ k: "eval", t: "No evaluation recorded" });
    } else if (next && daysUntil(next, today) < 0) {
      out.push({ k: "eval", t: `Re-evaluation overdue since ${next}` });
    } else if (next && daysUntil(next, today) <= 30) {
      out.push({ k: "evalsoon", t: `Re-evaluation due ${next}` });
    }
  }

  const last = lastEval(supplier);
  if (last && last.score < 3) {
    out.push({ k: "score", t: `Last score ${last.score} below 3.0` });
  }
  if (!supplier.reqs && supplier.status !== "Prospective") {
    out.push({
      k: "reqs",
      t: "Requirements to supplier not recorded (8.4.3)",
    });
  }
  return out;
}

export function appendTrail(
  trail: AslTrailEntry[],
  what: string,
  by: string,
  at = new Date()
): AslTrailEntry[] {
  return [
    {
      t: at.toISOString().slice(0, 16),
      by,
      what,
    },
    ...trail,
  ];
}

export type ApplyRulesResult = {
  supplier: AslSupplier;
  statusChanged: boolean;
  previousStatus: AslStatus;
};

/**
 * Apply standing rules for Approved/Conditional suppliers.
 * Prospective / Suspended / Removed are left alone (except caller-driven transitions).
 */
export function applyStandingRules(
  supplier: AslSupplier,
  settings: Pick<AslSettings, "lead" | "criteria">,
  actor = "System",
  today = startOfToday()
): ApplyRulesResult {
  const previousStatus = supplier.status;
  if (
    previousStatus === "Removed" ||
    previousStatus === "Suspended" ||
    previousStatus === "Prospective"
  ) {
    return { supplier, statusChanged: false, previousStatus };
  }

  const last = lastEval(supplier);
  const hard =
    expiredDocs(supplier, settings.lead, today).filter((d) => d.req).length >
      0 ||
    missingDocs(supplier, settings.lead, today).length > 0 ||
    (last !== null && last.score < 3);

  const nextStatus: AslStatus = hard ? "Conditional" : "Approved";
  if (nextStatus === previousStatus) {
    return { supplier, statusChanged: false, previousStatus };
  }

  const updated: AslSupplier = {
    ...supplier,
    status: nextStatus,
    trail: appendTrail(
      supplier.trail,
      `Status changed ${previousStatus} → ${nextStatus} by rule (${
        hard
          ? "expired/missing mandatory document or low score"
          : "all requirements met"
      })`,
      actor
    ),
  };
  return { supplier: updated, statusChanged: true, previousStatus };
}

/**
 * Apply evaluation outcome rules (Prospective→Approved, score&lt;2→Suspended).
 */
export function applyEvaluationOutcome(
  supplier: AslSupplier,
  evaluation: AslEvaluation,
  actor: string,
  today = startOfToday()
): AslSupplier {
  let next = { ...supplier };
  const score = evaluation.score;

  if (next.status === "Prospective" && score >= 3) {
    next = {
      ...next,
      status: "Approved",
      appon: toIsoDate(today),
      appby: actor,
      trail: appendTrail(
        next.trail,
        "Approved following evaluation",
        actor
      ),
    };
  }
  if (score < 2) {
    next = {
      ...next,
      status: "Suspended",
      trail: appendTrail(
        next.trail,
        "Suspended by rule: score below 2.0",
        actor
      ),
    };
  }
  return next;
}

export function isDocRequiredForSupplier(
  supplier: Pick<AslSupplier, "crit" | "cat">,
  type: string
): boolean {
  return requiredDocs(supplier).some((r) => r.split("|").includes(type));
}

export function validateCriteriaWeights(criteria: AslCriterion[]): string | null {
  if (criteria.length < 1) return "At least one evaluation criterion is required";
  const total = criteria.reduce((sum, c) => sum + c.w, 0);
  if (total !== 100) return `Criteria weights total ${total}%, should be 100`;
  const keys = new Set<string>();
  for (const c of criteria) {
    if (!c.k.trim() || !c.n.trim()) return "Criterion key and name are required";
    if (c.w < 0 || c.w > 100) return "Criterion weight must be between 0 and 100";
    if (keys.has(c.k)) return `Duplicate criterion key: ${c.k}`;
    keys.add(c.k);
  }
  return null;
}
