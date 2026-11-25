/**
 * Pure helpers that map module domain models → Relyable emit payloads.
 * No IO — collectors load data then call these.
 */
import type { ScheduleRow } from "../../inventory/types";
import type { AslSupplier } from "../../supplier/types";
import {
  activePeople,
  daysUntil,
  findCompetency,
  latestRecord,
  matrixRow,
  personSummary,
} from "../../training/lib/training-rules";
import type { TrainingModel } from "../../training/types";
import type { EmitEvidenceInput } from "../types";

function todayIso(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export type OkTotal = { ok: number; total: number };

export function ratioStatus(
  ok: number,
  total: number
): "valid" | "partial" {
  if (total <= 0) return "valid";
  return ok >= total ? "valid" : "partial";
}

export function aggregateEmit(
  type: string,
  source: string,
  subjectId: string,
  ratio: OkTotal,
  now = new Date()
): EmitEvidenceInput | null {
  if (ratio.total <= 0) return null;
  return {
    type,
    status: ratioStatus(ratio.ok, ratio.total),
    observedAt: todayIso(now),
    level: 3,
    source,
    payload: { ok: ratio.ok, total: ratio.total },
    subject: { kind: "aggregate", id: subjectId },
  };
}

/** Mandatory competence cells: ok|soon count as held. */
export function aggregateTrainingCompetence(
  model: TrainingModel,
  now = new Date()
): OkTotal {
  let ok = 0;
  let total = 0;
  for (const person of activePeople(model)) {
    const summary = personSummary(model, person, now);
    total += summary.total;
    ok += summary.ok + summary.soon;
  }
  return { ok, total };
}

/** Mandatory cells whose competency evidence is Licence / card. */
export function aggregateTrainingLicence(
  model: TrainingModel,
  now = new Date()
): OkTotal {
  let ok = 0;
  let total = 0;
  for (const person of activePeople(model)) {
    for (const cell of matrixRow(model, person, now)) {
      if (cell.req.level !== "mandatory") continue;
      if (cell.req.comp.evidence !== "Licence / card") continue;
      total += 1;
      if (cell.st === "ok" || cell.st === "soon") ok += 1;
    }
  }
  return { ok, total };
}

/**
 * Starters past induction window who hold an induction record.
 * If no starters past the window, returns total 0 (omit emit).
 */
export function aggregateTrainingInduction(
  model: TrainingModel,
  now = new Date()
): OkTotal {
  const inductionDays = model.settings?.inductionDays ?? 14;
  const inductionComp = findCompetency(model, "induction");
  const starters = activePeople(model).filter(
    (p) => p.start && daysUntil(p.start, now) < -inductionDays
  );
  if (!starters.length) return { ok: 0, total: 0 };
  if (!inductionComp) return { ok: 0, total: starters.length };
  let ok = 0;
  for (const person of starters) {
    if (latestRecord(model, person.id, inductionComp.id)) ok += 1;
  }
  return { ok, total: starters.length };
}

export function aggregateTrainingEvidence(
  model: TrainingModel,
  now = new Date()
): EmitEvidenceInput[] {
  const out: EmitEvidenceInput[] = [];
  const competence = aggregateEmit(
    "training.competence",
    "module:training",
    "competence",
    aggregateTrainingCompetence(model, now),
    now
  );
  if (competence) out.push(competence);
  const licence = aggregateEmit(
    "training.licence",
    "module:training",
    "licence",
    aggregateTrainingLicence(model, now),
    now
  );
  if (licence) out.push(licence);
  const induction = aggregateEmit(
    "training.induction",
    "module:training",
    "induction",
    aggregateTrainingInduction(model, now),
    now
  );
  if (induction) out.push(induction);
  return out;
}

export type InventoryScheduleAggregateInput = {
  category?: string;
  checkName?: string;
};

/** Schedule rows in-date: state ok|soon. */
export function aggregateInventorySchedule(
  rows: ScheduleRow[],
  filter: InventoryScheduleAggregateInput
): OkTotal {
  const matched = rows.filter((row) => {
    if (filter.category && row.category !== filter.category) return false;
    if (filter.checkName && row.checkName !== filter.checkName) return false;
    return true;
  });
  const total = matched.length;
  const ok = matched.filter(
    (row) => row.state === "ok" || row.state === "soon"
  ).length;
  return { ok, total };
}

export function aggregateInventoryEvidence(
  rows: ScheduleRow[],
  now = new Date()
): EmitEvidenceInput[] {
  const out: EmitEvidenceInput[] = [];
  const specs: Array<{
    type: string;
    id: string;
    filter: InventoryScheduleAggregateInput;
  }> = [
    {
      type: "asset.loler",
      id: "loler",
      filter: { category: "Lifting equipment" },
    },
    {
      type: "asset.puwer",
      id: "puwer",
      filter: { category: "Production machinery" },
    },
    {
      type: "asset.calibration",
      id: "calibration",
      filter: {
        category: "Measuring & test equipment",
        checkName: "Calibration",
      },
    },
  ];
  for (const spec of specs) {
    const emit = aggregateEmit(
      spec.type,
      "module:inventory",
      spec.id,
      aggregateInventorySchedule(rows, spec.filter),
      now
    );
    if (emit) out.push(emit);
  }
  return out;
}

/** Critical suppliers that are Approved vs all critical live suppliers. */
export function aggregateAslCriticalApproved(
  suppliers: AslSupplier[]
): OkTotal {
  const critical = suppliers.filter((s) => s.crit === "Critical");
  const total = critical.length;
  const ok = critical.filter((s) => s.status === "Approved").length;
  return { ok, total };
}

export function aggregateAslEvidence(
  suppliers: AslSupplier[],
  now = new Date()
): EmitEvidenceInput[] {
  const emit = aggregateEmit(
    "supplier.approved",
    "module:suppliers",
    "approved",
    aggregateAslCriticalApproved(suppliers),
    now
  );
  return emit ? [emit] : [];
}

export function aggregateManagementReviewEvidence(
  stats: { completed: number; total: number },
  now = new Date()
): EmitEvidenceInput[] {
  if (stats.total <= 0 && stats.completed <= 0) return [];
  const total = Math.max(stats.total, stats.completed, 1);
  const ok = stats.completed;
  const emit = aggregateEmit(
    "gov.management.review",
    "module:management-reviews",
    "mgmt-review",
    { ok, total },
    now
  );
  return emit ? [emit] : [];
}
