/**
 * Deterministic intent router for Alice chat — module + mode + filters.
 * Explicit message words beat page hint; prior turn is weak bias only.
 */

export type AiIntentModule =
  | "tasks"
  | "risks"
  | "incidents"
  | "audits"
  | "documents"
  | "compliance"
  | "ofi"
  | "suppliers"
  | "customers"
  | "general";

export type AiIntentMode = "list" | "detail" | "cross_search" | "clarify";

export type AiIntentFilters = {
  priorityHigh?: boolean;
  openOnly?: boolean;
  overdue?: boolean;
};

export type AiChatIntent = {
  primaryModule: AiIntentModule;
  mode: AiIntentMode;
  filters: AiIntentFilters;
  /** Soft page bias that was considered but not forced. */
  pageHint?: string;
};

const MODULE_PATTERNS: Array<{ module: AiIntentModule; re: RegExp }> = [
  {
    module: "tasks",
    re: /\b(tasks?|to-?dos?|action items?|assignees?|due date|asap)\b/i,
  },
  {
    module: "incidents",
    re: /\b(incidents?|p1|p2|p3|breach(es)?|outage)\b/i,
  },
  {
    module: "risks",
    re: /\b(risks?|likelihood|consequence|mitigation|threat)\b/i,
  },
  {
    module: "audits",
    re: /\b(audits?|auditor|non-?conformit(?:y|ies)|findings?)\b/i,
  },
  {
    module: "documents",
    re: /\b(documents?|polic(?:y|ies)|sops?|procedures?|manual)\b/i,
  },
  {
    module: "compliance",
    re: /\b(compliance|controls?|clauses?|toolkit|iso\s?\d+)\b/i,
  },
  {
    module: "ofi",
    re: /\b(ofi|cips?|continual improvement|corrective actions?)\b/i,
  },
  {
    module: "suppliers",
    re: /\b(suppliers?|vendors?)\b/i,
  },
  {
    module: "customers",
    re: /\b(customers?|crm)\b/i,
  },
];

const LIST_RE =
  /\b(list|show|give me|what(?:'s| is| are)|which|open|outstanding|overdue|pending|asap|priority|high|need(?:s|ed)? attention|to (?:do|complete|finish))\b/i;

const DETAIL_RE =
  /\b(tell me (?:more )?about|explain|details?(?: of| for)?|summarise|summarize|what about)\b/i;

const HIGH_PRIORITY_RE =
  /\b(high[\s-]?priority|priority\s*=?\s*high|critical|asap|urgent)\b/i;

const OPEN_RE =
  /\b(open|outstanding|incomplete|pending|unresolved|active|not (?:yet )?complete[d]?)\b/i;

const OVERDUE_RE = /\b(overdue|past due|late)\b/i;

const PAGE_HINT_MAP: Record<string, AiIntentModule> = {
  tasks: "tasks",
  risks: "risks",
  incidents: "incidents",
  audits: "audits",
  documents: "documents",
  compliance: "compliance",
  ofi: "ofi",
  suppliers: "suppliers",
  customers: "customers",
};

function detectExplicitModule(message: string): AiIntentModule | null {
  for (const row of MODULE_PATTERNS) {
    if (row.re.test(message)) return row.module;
  }
  return null;
}

/**
 * Route a user message to a retrieval intent.
 */
export function routeChatIntent(input: {
  message: string;
  pageHint?: string | null;
  priorModule?: string | null;
}): AiChatIntent {
  const message = input.message.trim();
  const pageHint = input.pageHint?.trim() || undefined;
  const pageModule = pageHint ? PAGE_HINT_MAP[pageHint] : undefined;
  const priorModule = input.priorModule
    ? PAGE_HINT_MAP[input.priorModule] ??
      (MODULE_PATTERNS.some((p) => p.module === input.priorModule)
        ? (input.priorModule as AiIntentModule)
        : undefined)
    : undefined;

  const explicit = detectExplicitModule(message);
  // Explicit module words always win over page / prior bias.
  const primaryModule: AiIntentModule =
    explicit ?? pageModule ?? priorModule ?? "general";

  const filters: AiIntentFilters = {
    priorityHigh: HIGH_PRIORITY_RE.test(message),
    openOnly: OPEN_RE.test(message) || HIGH_PRIORITY_RE.test(message),
    overdue: OVERDUE_RE.test(message),
  };

  let mode: AiIntentMode = "cross_search";
  if (DETAIL_RE.test(message) && !LIST_RE.test(message)) {
    mode = "detail";
  } else if (
    LIST_RE.test(message) ||
    filters.priorityHigh ||
    filters.openOnly ||
    filters.overdue
  ) {
    mode = primaryModule === "general" ? "cross_search" : "list";
  } else if (explicit || pageModule) {
    mode = "cross_search";
  } else if (message.length < 12) {
    mode = "clarify";
  }

  // "high priority tasks" style: force tasks list even if page is risks.
  if (
    /\btasks?\b/i.test(message) &&
    (filters.priorityHigh || filters.openOnly || LIST_RE.test(message))
  ) {
    return {
      primaryModule: "tasks",
      mode: "list",
      filters: { ...filters, openOnly: true },
      pageHint,
    };
  }

  return {
    primaryModule,
    mode,
    filters,
    pageHint,
  };
}
