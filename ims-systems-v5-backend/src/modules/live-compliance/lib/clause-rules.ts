/**
 * Clause rules — one pure function per ISO clause, evaluated over a
 * ComplianceSnapshot. Each rule lists the standards it applies to: clause
 * numbers mean different things across standards (e.g. ISO 9001 9.1.2 is
 * customer satisfaction, ISO 14001/45001 9.1.2 is evaluation of compliance).
 *
 * Clauses without a rule keep the organisation's manual toolkit state.
 */

import type {
  ClauseEvaluation,
  ComplianceSnapshot,
  LiveModule,
  LiveStandard,
} from "../types";
import { addMonthsIso, daysUntil, formatDay, plural } from "./dates";

/** Something falling due within this many days is "At risk". */
export const SOON_DAYS = 30;
/** Audit findings due within this many days without evidence are at risk. */
export const FINDING_SOON_DAYS = 7;
/** Warn when the audit cycle ends within this many days with clauses left. */
export const AUDIT_CYCLE_WARN_DAYS = 60;
/** Incidents not investigated after this many days are flagged. */
export const INVESTIGATION_GRACE_DAYS = 2;
/** Near-miss pattern: this many in the same area within the window. */
export const PATTERN_MIN_COUNT = 3;
export const PATTERN_WINDOW_DAYS = 14;
/** Awareness target for policy acknowledgement. */
export const ACK_TARGET = 0.95;
/** Without an audit programme, expect an internal audit at least yearly. */
export const AUDIT_FALLBACK_MONTHS = 12;

const ALL: LiveStandard[] = ["ISO 9001", "ISO 14001", "ISO 45001"];
const ENV_OHS: LiveStandard[] = ["ISO 14001", "ISO 45001"];

export type ClauseRule = {
  id: string;
  clause: string;
  /** Fallback title when the toolkit row is missing. */
  title: string;
  standards: LiveStandard[];
  module: LiveModule;
  /**
   * null = no live data for this clause: the clause keeps its manual
   * toolkit state (if it is a manual clause) or is not shown.
   */
  evaluate(snapshot: ComplianceSnapshot): ClauseEvaluation | null;
};

const notTracked = (what: string): ClauseEvaluation => ({
  status: "not",
  detail: `${what} not tracked yet`,
});

/** lapsed when overdue, risk when due ≤ SOON_DAYS, else sustained. */
function byDueDate(
  due: string,
  today: string,
  messages: { over: string; soon: string; ok: string }
): ClauseEvaluation {
  const n = daysUntil(due, today);
  if (n < 0) return { status: "lapsed", detail: messages.over, due };
  if (n <= SOON_DAYS) return { status: "risk", detail: messages.soon, due };
  return { status: "sus", detail: messages.ok, due };
}

/** Earliest of a list of dated items. */
function earliest<T>(items: T[], date: (item: T) => string | null): T | null {
  let best: T | null = null;
  for (const item of items) {
    const d = date(item);
    if (!d) continue;
    if (!best || d < (date(best) as string)) best = item;
  }
  return best;
}

/** Near-miss clusters by area that have not been reviewed yet. */
export function nearMissPatterns(
  s: ComplianceSnapshot
): Array<{ area: string; count: number }> {
  if (!s.incidents.detailTracked) return [];
  const byArea = new Map<string, number>();
  for (const i of s.incidents.items) {
    if (!i.area || !i.type || !/near miss/i.test(i.type)) continue;
    const age = daysUntil(i.occurredOn, s.today);
    if (age > 0 || age < -PATTERN_WINDOW_DAYS) continue;
    byArea.set(i.area, (byArea.get(i.area) ?? 0) + 1);
  }
  const reviewed = new Set(s.risks.reviewedPatternAreas);
  return [...byArea.entries()]
    .filter(([area, count]) => count >= PATTERN_MIN_COUNT && !reviewed.has(area))
    .map(([area, count]) => ({ area, count }))
    .sort((a, b) => b.count - a.count);
}

/** Incidents still awaiting investigation after the grace period. */
export function overdueInvestigations(s: ComplianceSnapshot) {
  return s.incidents.items.filter(
    (i) =>
      i.investigation === "not_started" &&
      daysUntil(i.occurredOn, s.today) <= -INVESTIGATION_GRACE_DAYS
  );
}

/** Clauses in the audit programme not yet audited or planned (per standard). */
export function unauditedClauses(s: ComplianceSnapshot): string[] {
  const programme = s.audits.programme;
  if (!programme) return [];
  const left = new Set<string>();
  for (const standard of s.standards) {
    const audited = new Set(s.audits.audited[standard] ?? []);
    const planned = new Set(s.audits.planned[standard] ?? []);
    for (const clause of programme.inScope[standard] ?? []) {
      if (!audited.has(clause) && !planned.has(clause)) left.add(clause);
    }
  }
  return [...left].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true })
  );
}

export const CLAUSE_RULES: ClauseRule[] = [
  /* ---------------------------- Compliance ---------------------------- */
  {
    id: "legal-register-review",
    clause: "6.1.3",
    title: "Compliance obligations / legal requirements",
    standards: ENV_OHS,
    module: "compliance",
    evaluate(s) {
      if (!s.legal.tracked) return notTracked("Legal register");
      if (!s.legal.lastReviewedOn) {
        return s.legal.duties.length
          ? { status: "prog", detail: "Legal register has never been reviewed" }
          : { status: "not", detail: "No legal duties recorded yet" };
      }
      const due = addMonthsIso(s.legal.lastReviewedOn, s.legal.reviewIntervalMonths);
      return byDueDate(due, s.today, {
        over: `Legal register review overdue since ${formatDay(due)}`,
        soon: `Legal register review due ${formatDay(due)}`,
        ok: `Reviewed ${formatDay(s.legal.lastReviewedOn)}`,
      });
    },
  },
  {
    id: "legal-evidence",
    clause: "9.1.2",
    title: "Evaluation of compliance",
    standards: ENV_OHS,
    module: "compliance",
    evaluate(s) {
      if (!s.legal.tracked) return notTracked("Legal register");
      if (!s.legal.duties.length) {
        return { status: "not", detail: "No legal duties recorded yet" };
      }
      const missing = s.legal.duties.filter((d) => !d.hasEvidence).length;
      return missing
        ? {
            status: "prog",
            detail: `${plural(missing, "legal duty", "legal duties")} with no evidence linked`,
          }
        : { status: "sus", detail: "Every legal duty has evidence" };
    },
  },

  /* ----------------------------- Inventory ---------------------------- */
  {
    id: "calibration",
    clause: "7.1.5",
    title: "Monitoring and measuring resources",
    standards: ["ISO 9001"],
    module: "inventory",
    evaluate(s) {
      if (!s.inventory.tracked) return notTracked("Inventory");
      const checks = s.inventory.checks.filter(
        (c) => c.measuring && c.stage !== "Retired" && c.nextDue
      );
      if (!checks.length) {
        return { status: "not", detail: "No measuring equipment with calibration schedules" };
      }
      const worst = earliest(checks, (c) => c.nextDue)!;
      return byDueDate(worst.nextDue!, s.today, {
        over: `${worst.name}: ${worst.checkName.toLowerCase()} overdue since ${formatDay(worst.nextDue!)}`,
        soon: `${worst.name}: ${worst.checkName.toLowerCase()} due ${formatDay(worst.nextDue!)}`,
        ok: `All ${plural(new Set(checks.map((c) => c.assetId)).size, "instrument")} calibrated`,
      });
    },
  },
  {
    id: "equipment-control",
    clause: "8.1",
    title: "Operational planning and control",
    standards: ALL,
    module: "inventory",
    evaluate(s) {
      if (!s.inventory.tracked) return notTracked("Inventory");
      const checks = s.inventory.checks.filter(
        (c) => !c.measuring && c.stage !== "Retired"
      );
      if (!checks.length) {
        return { status: "not", detail: "No equipment with statutory checks registered" };
      }
      const failedInUse = checks.find(
        (c) => c.lastResult === "Fail" && c.stage === "In service"
      );
      if (failedInUse) {
        return {
          status: "lapsed",
          detail: `${failedInUse.name} failed its ${failedInUse.checkName.toLowerCase()} and is still in service`,
        };
      }
      const dated = checks.filter((c) => c.nextDue && c.stage !== "Quarantined");
      const worst = earliest(dated, (c) => c.nextDue);
      if (!worst) return { status: "sus", detail: "All equipment in date" };
      return byDueDate(worst.nextDue!, s.today, {
        over: `${worst.name}: ${worst.checkName} overdue since ${formatDay(worst.nextDue!)}`,
        soon: `${worst.name}: ${worst.checkName} due ${formatDay(worst.nextDue!)}`,
        ok: "All equipment in date",
      });
    },
  },

  /* ------------------------------ Audits ------------------------------ */
  {
    id: "internal-audit",
    clause: "9.2",
    title: "Internal audit",
    standards: ALL,
    module: "audits",
    evaluate(s) {
      if (!s.audits.tracked) return notTracked("Audits");
      const programme = s.audits.programme;
      if (programme?.cycleEnd) {
        const left = unauditedClauses(s);
        const n = daysUntil(programme.cycleEnd, s.today);
        const inScope = new Set(
          s.standards.flatMap((st) => programme.inScope[st] ?? [])
        ).size;
        if (left.length && n < 0) {
          return {
            status: "lapsed",
            detail: `Audit cycle ended ${formatDay(programme.cycleEnd)} with ${plural(left.length, "clause")} not audited`,
            due: programme.cycleEnd,
          };
        }
        if (left.length && n <= AUDIT_CYCLE_WARN_DAYS) {
          return {
            status: "risk",
            detail: `${plural(left.length, "clause")} not yet audited, cycle ends ${formatDay(programme.cycleEnd)}`,
            due: programme.cycleEnd,
          };
        }
        return {
          status: "sus",
          detail: `${inScope - left.length} of ${inScope} clauses audited or planned · cycle ends ${formatDay(programme.cycleEnd)}`,
          due: programme.cycleEnd,
        };
      }
      if (!s.audits.lastCompletedOn) {
        return s.audits.auditCount
          ? { status: "prog", detail: "Audits scheduled, none completed yet" }
          : { status: "not", detail: "No internal audits recorded" };
      }
      const due = addMonthsIso(s.audits.lastCompletedOn, AUDIT_FALLBACK_MONTHS);
      return byDueDate(due, s.today, {
        over: `No internal audit completed since ${formatDay(s.audits.lastCompletedOn)}`,
        soon: `Next internal audit due by ${formatDay(due)}`,
        ok: `Last internal audit completed ${formatDay(s.audits.lastCompletedOn)}`,
      });
    },
  },
  {
    id: "nonconformity",
    clause: "10.2",
    title: "Nonconformity and corrective action",
    standards: ALL,
    module: "audits",
    evaluate(s) {
      if (!s.audits.findingsTracked && !s.incidents.detailTracked) {
        return notTracked("Findings and incident investigations");
      }
      const open = s.audits.findings.filter((f) => f.open && f.dueDate);
      const over = open.filter((f) => daysUntil(f.dueDate!, s.today) < 0);
      if (over.length) {
        const f = earliest(over, (x) => x.dueDate)!;
        return { status: "lapsed", detail: `${f.reference} past its due date`, due: f.dueDate };
      }
      const soon = open.filter(
        (f) => !f.hasEvidence && daysUntil(f.dueDate!, s.today) <= FINDING_SOON_DAYS
      );
      if (soon.length) {
        const f = earliest(soon, (x) => x.dueDate)!;
        return {
          status: "risk",
          detail: `${f.reference} due ${formatDay(f.dueDate!)}, no evidence yet`,
          due: f.dueDate,
        };
      }
      const uninvestigated = overdueInvestigations(s);
      if (uninvestigated.length) {
        return {
          status: "risk",
          detail: `${uninvestigated[0]!.reference} not investigated`,
        };
      }
      return { status: "sus", detail: "All findings and incidents in hand" };
    },
  },

  /* ----------------------------- Training ----------------------------- */
  {
    id: "competence",
    clause: "7.2",
    title: "Competence",
    standards: ALL,
    module: "training",
    evaluate(s) {
      const t = s.training;
      if (!t.tracked) return notTracked("Training");
      if (!t.peopleCount) return { status: "not", detail: "No people in the training matrix" };
      const expired = t.gaps.filter((g) => g.state === "over" && !g.booked);
      if (expired.length) {
        const g = earliest(expired, (x) => x.next) ?? expired[0]!;
        return {
          status: "lapsed",
          detail: `${g.personName}: ${g.competencyName} expired${g.next ? ` ${formatDay(g.next)}` : ""}`,
          due: g.next,
        };
      }
      const expiringSoon = t.gaps.filter(
        (g) =>
          (g.state === "soon" || g.state === "over") &&
          !g.booked &&
          g.next &&
          daysUntil(g.next, s.today) <= SOON_DAYS
      );
      if (expiringSoon.length) {
        const g = earliest(expiringSoon, (x) => x.next)!;
        return {
          status: "risk",
          detail: `${plural(expiringSoon.length, "competency", "competencies")} expire within ${SOON_DAYS} days`,
          due: g.next,
        };
      }
      const bookedExpired = t.gaps.filter((g) => g.state === "over" && g.booked);
      if (bookedExpired.length) {
        const g = bookedExpired[0]!;
        return {
          status: "risk",
          detail: `${g.personName}: ${g.competencyName} expired, refresher booked`,
        };
      }
      if (t.rolesWithoutRequirements.length) {
        return {
          status: "risk",
          detail: `Role "${t.rolesWithoutRequirements[0]!.name}" has no required competencies`,
        };
      }
      const missing = t.gaps.filter((g) => g.state === "none");
      if (missing.length) {
        return {
          status: "risk",
          detail: `${missing[0]!.personName} has untrained required competencies`,
        };
      }
      return { status: "sus", detail: "Everyone competent for their role" };
    },
  },
  {
    id: "awareness",
    clause: "7.3",
    title: "Awareness",
    standards: ALL,
    module: "training",
    evaluate(s) {
      const t = s.training;
      if (!t.tracked) return notTracked("Training");
      const acks = t.acknowledgements.filter((a) => a.required > 0);
      if (!acks.length) {
        return { status: "not", detail: "No policy acknowledgement tracked" };
      }
      const worst = acks
        .map((a) => ({ ...a, ratio: a.acknowledged / a.required }))
        .sort((a, b) => a.ratio - b.ratio)[0]!;
      const pct = Math.round(worst.ratio * 100);
      return worst.ratio >= ACK_TARGET
        ? { status: "sus", detail: `${worst.competencyName} read by ${pct}%` }
        : {
            status: "risk",
            detail: `${worst.competencyName} read by ${worst.acknowledged} of ${worst.required} (${pct}%)`,
          };
    },
  },

  /* ------------------------------- Risks ------------------------------ */
  {
    id: "risk-review",
    clause: "6.1",
    title: "Actions to address risks and opportunities",
    standards: ALL,
    module: "risks",
    evaluate(s) {
      if (!s.risks.tracked) return notTracked("Risks");
      if (!s.risks.items.length) return { status: "not", detail: "No risks recorded" };
      const dated = s.risks.items.filter((r) => r.nextReviewDate);
      if (!dated.length) {
        return {
          status: "prog",
          detail: `${plural(s.risks.items.length, "risk")} with no review date`,
        };
      }
      const worst = earliest(dated, (r) => r.nextReviewDate)!;
      const undated = s.risks.items.length - dated.length;
      const result = byDueDate(worst.nextReviewDate!, s.today, {
        over: `${worst.reference} review overdue`,
        soon: `${worst.reference} review due ${formatDay(worst.nextReviewDate!)}`,
        ok: "All risk reviews in date",
      });
      if (result.status === "sus" && undated) {
        return { status: "prog", detail: `${plural(undated, "risk")} with no review date` };
      }
      return result;
    },
  },
  {
    id: "hazard-patterns",
    clause: "6.1.2",
    title: "Environmental aspects / hazard identification",
    standards: ENV_OHS,
    module: "risks",
    evaluate(s) {
      if (!s.risks.tracked) return notTracked("Risks");
      if (!s.risks.items.length) {
        return { status: "not", detail: "No hazards or aspects recorded" };
      }
      if (!s.incidents.detailTracked) {
        return { status: "sus", detail: `${plural(s.risks.items.length, "hazard or aspect", "hazards and aspects")} recorded` };
      }
      const patterns = nearMissPatterns(s);
      if (patterns.length) {
        const p = patterns[0]!;
        return {
          status: "risk",
          detail: `${p.count} near misses at ${p.area} in ${PATTERN_WINDOW_DAYS} days: hazard review needed`,
        };
      }
      return { status: "sus", detail: "No unreviewed incident patterns" };
    },
  },

  /* ----------------------------- Incidents ---------------------------- */
  {
    id: "incident-monitoring",
    clause: "9.1",
    title: "Monitoring, measurement, analysis and evaluation",
    standards: ALL,
    module: "incidents",
    evaluate(s) {
      if (!s.incidents.tracked) return notTracked("Incidents");
      const waiting = s.incidents.items.filter(
        (i) => i.investigation === "not_started"
      );
      return waiting.length > 2
        ? { status: "risk", detail: `${waiting.length} incidents awaiting investigation` }
        : {
            status: "sus",
            detail: waiting.length
              ? `${plural(waiting.length, "incident")} awaiting investigation`
              : "No incidents awaiting investigation",
          };
    },
  },

  /* ------------------------- Management reviews ----------------------- */
  {
    id: "management-review",
    clause: "9.3",
    title: "Management review",
    standards: ALL,
    module: "reviews",
    evaluate(s) {
      const r = s.reviews;
      if (!r.tracked) return notTracked("Management reviews");
      const inputs = r.inputsTracked
        ? ` · ${r.inputs.filter((i) => i.ready).length} of ${r.inputs.length} inputs ready`
        : "";
      const scheduled = r.scheduled ? ` · scheduled ${formatDay(r.scheduled.date)}` : "";
      if (!r.lastHeld) {
        return r.scheduled
          ? { status: "prog", detail: `First review scheduled ${formatDay(r.scheduled.date)}${inputs}`, due: r.scheduled.date }
          : { status: "not", detail: "No management review held yet" };
      }
      const due = addMonthsIso(r.lastHeld, r.intervalMonths ?? 12);
      return byDueDate(due, s.today, {
        over: `Review overdue since ${formatDay(due)}${scheduled}`,
        soon: `Review due ${formatDay(due)}${inputs}${scheduled}`,
        ok: `Last held ${formatDay(r.lastHeld)}`,
      });
    },
  },
  {
    id: "objectives",
    clause: "6.2",
    title: "Objectives and planning to achieve them",
    standards: ALL,
    module: "reviews",
    evaluate(s) {
      if (!s.objectives.tracked) return notTracked("Objectives");
      return s.objectives.count
        ? { status: "sus", detail: `${plural(s.objectives.count, "objective")} recorded` }
        : { status: "not", detail: "No objectives recorded" };
    },
  },
  {
    id: "continual-improvement",
    clause: "10.3",
    title: "Continual improvement",
    standards: ALL,
    module: "reviews",
    evaluate(s) {
      const r = s.reviews;
      if (!r.tracked) return notTracked("Management reviews");
      const overdue = r.actions.filter(
        (a) => a.open && a.due && daysUntil(a.due, s.today) < 0
      );
      if (overdue.length) {
        return {
          status: "risk",
          detail: `${plural(overdue.length, "review action")} overdue: ${overdue[0]!.title}`,
        };
      }
      if (!r.lastHeld && !r.actions.length) {
        return { status: "not", detail: "No review actions recorded" };
      }
      return { status: "sus", detail: "Review actions on track" };
    },
  },

  /* ----------------------------- Documents ---------------------------- */
  {
    id: "document-review",
    clause: "7.5",
    title: "Documented information",
    standards: ALL,
    module: "documents",
    evaluate(s) {
      // No review dates yet → keep the manual toolkit state for 7.5.
      if (!s.documents.tracked || !s.documents.items.length) return null;
      const worst = earliest(s.documents.items, (d) => d.reviewDate)!;
      return byDueDate(worst.reviewDate, s.today, {
        over: `${worst.name}: review overdue since ${formatDay(worst.reviewDate)}`,
        soon: `${worst.name}: review due ${formatDay(worst.reviewDate)}`,
        ok: `All ${plural(s.documents.items.length, "controlled document")} within review date`,
      });
    },
  },

  /* ----------------------------- Suppliers ---------------------------- */
  ...(["8.4", "8.1.4"] as const).map(
    (clause): ClauseRule => ({
      id: `supplier-control-${clause}`,
      clause,
      title:
        clause === "8.4"
          ? "Control of externally provided processes, products and services"
          : "Procurement",
      standards: clause === "8.4" ? ["ISO 9001"] : ["ISO 45001"],
      module: "suppliers",
      evaluate: evaluateSuppliers,
    })
  ),
];

/** Approved-supplier list: certificates in date, evaluations on time. */
export function evaluateSuppliers(s: ComplianceSnapshot): ClauseEvaluation | null {
  if (!s.suppliers.tracked || !s.suppliers.items.length) return null;
  const issues = s.suppliers.items.flatMap((sup) =>
    sup.issues.map((issue) => ({ ...issue, supplier: sup.name, approved: sup.approved }))
  );
  const lapsed = issues.find(
    (i) => i.approved && (i.kind === "expired" || i.kind === "eval")
  );
  if (lapsed) {
    return { status: "lapsed", detail: `${lapsed.supplier}: ${lapsed.text}`, due: lapsed.due };
  }
  const soon = earliest(
    issues.filter((i) => i.kind === "soon" || i.kind === "evalsoon"),
    (i) => i.due
  );
  if (soon) return { status: "risk", detail: `${soon.supplier}: ${soon.text}`, due: soon.due };
  const missing = issues.find((i) => i.kind === "missing" || i.kind === "expired");
  if (missing) return { status: "prog", detail: `${missing.supplier}: ${missing.text}` };
  return {
    status: "sus",
    detail: `${plural(s.suppliers.items.length, "supplier")} with certificates in date`,
  };
}

/** Rules that apply to a given standard. */
export function rulesForStandard(standard: LiveStandard): ClauseRule[] {
  return CLAUSE_RULES.filter((rule) => rule.standards.includes(standard));
}

/** Evaluate every applicable rule: key `${standard}|${clause}`. */
export function evaluateClauses(
  snapshot: ComplianceSnapshot
): Map<string, ClauseEvaluation & { rule: ClauseRule; standard: LiveStandard }> {
  const out = new Map<
    string,
    ClauseEvaluation & { rule: ClauseRule; standard: LiveStandard }
  >();
  for (const standard of snapshot.standards) {
    for (const rule of rulesForStandard(standard)) {
      const result = rule.evaluate(snapshot);
      if (!result) continue;
      out.set(`${standard}|${rule.clause}`, {
        ...result,
        due: result.due ?? null,
        rule,
        standard,
      });
    }
  }
  return out;
}
