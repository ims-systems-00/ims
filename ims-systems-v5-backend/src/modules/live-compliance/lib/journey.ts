/**
 * "Get ready for ISO" — the 12-step journey for organisations new to ISO
 * (prototype journey). A step is done when a person marks it done, or
 * automatically when every clause it covers is Implemented or better.
 */

import type { ClauseHealthStatus, LiveModule } from "../types";

export type JourneyStepDefinition = {
  id: string;
  title: string;
  /** Clause numbers covered ("all" for the readiness check). */
  clauses: string[];
  module: LiveModule;
  /** What the standard asks, in plain words. */
  asks: string;
  /** What good evidence looks like. */
  evidence: string;
  /** Where the work is done. */
  href: string;
};

export const JOURNEY_STEPS: JourneyStepDefinition[] = [
  { id: "scope", title: "Choose standards and scope", clauses: ["4.3"], module: "compliance", asks: "Decide which standards you want and which sites and activities they cover.", evidence: "A one-paragraph scope statement naming sites, activities and exclusions.", href: "/compliance" },
  { id: "context", title: "Understand your context", clauses: ["4.1", "4.2"], module: "compliance", asks: "List the issues that affect you and who has an interest in how you work.", evidence: "A short issues list and an interested-parties table with their needs.", href: "/compliance" },
  { id: "leadership", title: "Policy, roles and responsibilities", clauses: ["5.1", "5.2", "5.3", "5.4"], module: "compliance", asks: "Top management sets a policy and makes sure people know their roles.", evidence: "A signed 1 to 2 page policy and a roles chart.", href: "/documents" },
  { id: "risks", title: "Risks, hazards, aspects and legal duties", clauses: ["6.1"], module: "risks", asks: "Work out what could go wrong (and right), and which laws apply.", evidence: "A scored risk register and a legal register linked to evidence.", href: "/risks" },
  { id: "objectives", title: "Objectives", clauses: ["6.2"], module: "reviews", asks: "Set a few measurable goals with owners and dates.", evidence: "3 to 5 objectives with measures, owners and progress.", href: "/kpi-objectives" },
  { id: "competence", title: "Competence and awareness", clauses: ["7.2", "7.3"], module: "training", asks: "Decide what each role needs and show people have it.", evidence: "A training matrix with in-date certificates.", href: "/training" },
  { id: "documents", title: "Documents and records", clauses: ["7.5"], module: "documents", asks: "Control the documents you need and keep records.", evidence: "Version-controlled procedures and a record of who read them.", href: "/documents" },
  { id: "operations", title: "Operational control", clauses: ["8.1", "8.2"], module: "inventory", asks: "Control your work: equipment, suppliers, emergencies.", evidence: "Inspection schedules, approved suppliers, emergency plans.", href: "/inventory" },
  { id: "incidents", title: "Incidents and nonconformities", clauses: ["9.1", "10.2"], module: "incidents", asks: "Record what goes wrong, investigate and fix the cause.", evidence: "Incident log with investigations and closed actions.", href: "/incidents" },
  { id: "audit", title: "Internal audit", clauses: ["9.2"], module: "audits", asks: "Check your system works, clause by clause, at planned intervals.", evidence: "An audit programme, completed checklists and findings.", href: "/audits" },
  { id: "review", title: "Management review", clauses: ["9.3"], module: "reviews", asks: "Top management reviews performance and decides actions.", evidence: "Minutes covering every required input, with actions.", href: "/management-reviews" },
  { id: "readiness", title: "Readiness check", clauses: ["all"], module: "compliance", asks: "Check you are ready for a certification body.", evidence: "Readiness score and an empty gap list.", href: "/compliance/live" },
];

export const JOURNEY_CLAUSES = [
  ...new Set(JOURNEY_STEPS.flatMap((s) => s.clauses).filter((c) => c !== "all")),
];

/** Implemented or better: in place today (at risk still counts as in place). */
export const IN_PLACE: ClauseHealthStatus[] = ["impl", "sus", "risk"];

export type JourneyClauseState = { clause: string; standard: string; status: ClauseHealthStatus };

export type JourneyStep = JourneyStepDefinition & {
  index: number;
  status: "done" | "now" | "todo";
  /** Done because its clauses are in place (not ticked by a person). */
  auto: boolean;
  clauseStates: JourneyClauseState[];
};

export type JourneyResponse = {
  done: number;
  total: number;
  next: string | null;
  steps: JourneyStep[];
};

/** Pure: combine clause states and manually completed steps. */
export function buildJourney(
  states: JourneyClauseState[],
  completed: string[],
  percentages: number[]
): JourneyResponse {
  const manual = new Set(completed);
  const doneFlags = JOURNEY_STEPS.map((step) => {
    if (step.id === "readiness") return { done: false, auto: false };
    const own = states.filter((s) => step.clauses.includes(s.clause));
    const auto = own.length > 0 && own.every((s) => IN_PLACE.includes(s.status));
    return { done: manual.has(step.id) || auto, auto: auto && !manual.has(step.id) };
  });
  // Readiness: every other step done, nothing lapsed, ≥ 90% compliant today.
  const othersDone = doneFlags.slice(0, -1).every((f) => f.done);
  const readinessAuto =
    othersDone &&
    !states.some((s) => s.status === "lapsed") &&
    percentages.length > 0 &&
    percentages.every((p) => p >= 90);
  doneFlags[doneFlags.length - 1] = {
    done: manual.has("readiness") || readinessAuto,
    auto: readinessAuto && !manual.has("readiness"),
  };

  const firstOpen = doneFlags.findIndex((f) => !f.done);
  const steps: JourneyStep[] = JOURNEY_STEPS.map((step, index) => ({
    ...step,
    index,
    status: doneFlags[index]!.done ? "done" : index === firstOpen ? "now" : "todo",
    auto: doneFlags[index]!.auto,
    clauseStates:
      step.id === "readiness" ? [] : states.filter((s) => step.clauses.includes(s.clause)),
  }));
  return {
    done: doneFlags.filter((f) => f.done).length,
    total: JOURNEY_STEPS.length,
    next: firstOpen >= 0 ? JOURNEY_STEPS[firstOpen]!.title : null,
    steps,
  };
}
