/**
 * Golden question set for Alice factual eval (Phase 0 / Phase 4).
 * Factual rows expect deterministic analytics / list tools.
 * Advisory rows must stay citation-grounded (no invented refs).
 */

export type AliceGoldenKind = "factual" | "advisory";

export type AliceGoldenQuestion = {
  id: string;
  kind: AliceGoldenKind;
  prompt: string;
  expectModule:
    | "risks"
    | "tasks"
    | "incidents"
    | "audits"
    | "documents"
    | "compliance"
    | "ofi"
    | "general";
  expectAnalytics?:
    | "oldest_risk"
    | "newest_risk"
    | "highest_risk"
    | "risk_counts"
    | "compliance_concerns"
    | "org_health"
    | "person_filter"
    | null;
  expectTool?: string;
  asserts?: {
    mustNotSayNoneWhenData?: boolean;
    mustCiteModule?: string;
  };
};

export const ALICE_GOLDEN_QUESTIONS: AliceGoldenQuestion[] = [
  {
    id: "risk-oldest",
    kind: "factual",
    prompt: "whats the oldest risk raised",
    expectModule: "risks",
    expectAnalytics: "oldest_risk",
    expectTool: "analytics_risks",
    asserts: { mustNotSayNoneWhenData: true, mustCiteModule: "risks" },
  },
  {
    id: "risk-newest",
    kind: "factual",
    prompt: "What is the newest risk raised?",
    expectModule: "risks",
    expectAnalytics: "newest_risk",
    expectTool: "analytics_risks",
    asserts: { mustNotSayNoneWhenData: true },
  },
  {
    id: "risk-highest",
    kind: "factual",
    prompt: "Which risk has the highest current score?",
    expectModule: "risks",
    expectAnalytics: "highest_risk",
    expectTool: "analytics_risks",
  },
  {
    id: "risk-escalated",
    kind: "factual",
    prompt: "list escalated risks",
    expectModule: "risks",
    expectAnalytics: null,
    expectTool: "list_risks",
  },
  {
    id: "risk-raised-by-person",
    kind: "factual",
    prompt: "any risks raised by Zain?",
    expectModule: "risks",
    expectAnalytics: "person_filter",
    expectTool: "list_risks",
    asserts: { mustNotSayNoneWhenData: true, mustCiteModule: "risks" },
  },
  {
    id: "risk-owned-by-person",
    kind: "factual",
    prompt: "any risks owned by Alex?",
    expectModule: "risks",
    expectAnalytics: "person_filter",
    expectTool: "list_risks",
    asserts: { mustNotSayNoneWhenData: true, mustCiteModule: "risks" },
  },
  {
    id: "risk-involved-person",
    kind: "factual",
    prompt: "risks by Sam",
    expectModule: "risks",
    expectAnalytics: "person_filter",
    expectTool: "list_risks",
    asserts: { mustNotSayNoneWhenData: true, mustCiteModule: "risks" },
  },
  {
    id: "risk-possessive-person",
    kind: "factual",
    prompt: "Show Sam's risks",
    expectModule: "risks",
    expectAnalytics: "person_filter",
    expectTool: "list_risks",
    asserts: { mustNotSayNoneWhenData: true },
  },
  {
    id: "risk-counts",
    kind: "factual",
    prompt: "How many open vs mitigated risks do we have?",
    expectModule: "risks",
    expectAnalytics: "risk_counts",
    expectTool: "analytics_risks",
  },
  {
    id: "compliance-concerns",
    kind: "advisory",
    prompt: "what are my major concerns for compliance",
    expectModule: "compliance",
    expectAnalytics: "compliance_concerns",
    expectTool: "analytics_compliance",
    asserts: { mustNotSayNoneWhenData: true, mustCiteModule: "compliance" },
  },
  {
    id: "compliance-gaps",
    kind: "factual",
    prompt: "Show selected controls that are not implemented",
    expectModule: "compliance",
    expectAnalytics: "compliance_concerns",
    expectTool: "list_compliance",
  },
  {
    id: "tasks-overdue",
    kind: "factual",
    prompt: "What tasks are overdue?",
    expectModule: "tasks",
    expectAnalytics: null,
    expectTool: "list_tasks",
  },
  {
    id: "tasks-high",
    kind: "factual",
    prompt: "Show high priority incomplete tasks",
    expectModule: "tasks",
    expectAnalytics: null,
    expectTool: "list_tasks",
  },
  {
    id: "incidents-open",
    kind: "factual",
    prompt: "List open high priority incidents",
    expectModule: "incidents",
    expectAnalytics: null,
    expectTool: "list_incidents",
  },
  {
    id: "audits-open",
    kind: "factual",
    prompt: "Which audits are still in progress?",
    expectModule: "audits",
    expectAnalytics: null,
    expectTool: "list_audits",
  },
  {
    id: "ofi-open",
    kind: "factual",
    prompt: "Show open OFIs",
    expectModule: "ofi",
    expectAnalytics: null,
    expectTool: "list_ofi",
  },
  {
    id: "org-health",
    kind: "advisory",
    prompt: "what should I worry about right now",
    expectModule: "general",
    expectAnalytics: "org_health",
    expectTool: "analytics_org_health",
    asserts: { mustNotSayNoneWhenData: true },
  },
  {
    id: "org-concerns",
    kind: "advisory",
    prompt: "What are my major concerns?",
    expectModule: "general",
    expectAnalytics: "org_health",
    expectTool: "analytics_org_health",
  },
  {
    id: "docs-policy",
    kind: "factual",
    prompt: "Find the information security policy document",
    expectModule: "documents",
    expectAnalytics: null,
    expectTool: "search_documents",
  },
];

/** Beta exit: factual golden routing/tool pass-rate target. */
export const ALICE_FACTUAL_PASS_RATE_TARGET = 0.95;
