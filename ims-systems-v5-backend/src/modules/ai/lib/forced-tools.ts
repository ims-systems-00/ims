/**
 * Server-side forced analytics tool selection for high-confidence factual intents.
 */

import type { AiChatIntent } from "./intent-router";

export type AliceAnalyticsKind =
  | "oldest_risk"
  | "newest_risk"
  | "highest_risk"
  | "risk_counts"
  | "compliance_concerns"
  | "org_health"
  | "person_filter"
  | null;

export type ForcedAliceTool = {
  name: string;
  args: Record<string, unknown>;
  analyticsKind: Exclude<AliceAnalyticsKind, null>;
};

const OLDEST_RE =
  /\b(oldest|earliest|first\s+raised|raised\s+first|longest\s+standing)\b/i;
const NEWEST_RE =
  /\b(newest|latest|most\s+recent(ly)?\s+raised|last\s+raised)\b/i;
const HIGHEST_RISK_RE =
  /\b(highest|biggest|top)\s+(current\s+)?(risk\s+)?score|highest\s+risk\b/i;
const RISK_COUNTS_RE =
  /\b(how\s+many|count|number\s+of)\b.*\brisks?\b|\brisks?\b.*\b(how\s+many|count)\b/i;
const COMPLIANCE_TOPIC_RE =
  /\b(compliance|controls?|clauses?|toolkit|iso\s?\d+)\b/i;
const COMPLIANCE_GAP_RE =
  /\b(gaps?|not\s+implemented|non[-\s]?implemented|lowest\s+progress)\b/i;
const ORG_HEALTH_RE =
  /\b(major\s+concerns?|what\s+should\s+i\s+worry|what\s+to\s+worry|priorit(?:y|ies)|attention\s+needed|org(?:anisation)?\s+health|what(?:'s| is)\s+wrong)\b/i;

export function detectAnalyticsKind(
  message: string,
  intent: AiChatIntent
): AliceAnalyticsKind {
  const text = message.trim();
  if (intent.primaryModule === "risks" || /\brisks?\b/i.test(text)) {
    if (OLDEST_RE.test(text)) return "oldest_risk";
    if (NEWEST_RE.test(text)) return "newest_risk";
    if (HIGHEST_RISK_RE.test(text)) return "highest_risk";
    if (RISK_COUNTS_RE.test(text)) return "risk_counts";
  }
  if (
    intent.primaryModule === "compliance" ||
    COMPLIANCE_TOPIC_RE.test(text)
  ) {
    if (
      COMPLIANCE_GAP_RE.test(text) ||
      ORG_HEALTH_RE.test(text) ||
      intent.primaryModule === "compliance"
    ) {
      return "compliance_concerns";
    }
  }
  if (ORG_HEALTH_RE.test(text) && !COMPLIANCE_TOPIC_RE.test(text)) {
    return "org_health";
  }
  return null;
}

function resolvePersonForcedTool(
  intent: AiChatIntent
): ForcedAliceTool | null {
  const name = intent.filters.personName?.trim();
  const role = intent.filters.personRole;
  if (!name || !role) return null;

  if (role === "unit") {
    const tool =
      intent.primaryModule === "tasks"
        ? "list_tasks"
        : intent.primaryModule === "incidents"
          ? "list_incidents"
          : intent.primaryModule === "ofi"
            ? "list_ofi"
            : "list_risks";
    return {
      name: tool,
      args: { unitName: name, limit: 8 },
      analyticsKind: "person_filter",
    };
  }

  if (intent.primaryModule === "tasks" || role === "assignee") {
    return {
      name: "list_tasks",
      args: { assigneeName: name, incomplete: true, limit: 8 },
      analyticsKind: "person_filter",
    };
  }
  if (intent.primaryModule === "incidents") {
    return {
      name: "list_incidents",
      args: { ownerName: name, limit: 8 },
      analyticsKind: "person_filter",
    };
  }
  if (intent.primaryModule === "ofi") {
    return {
      name: "list_ofi",
      args: { ownerName: name, limit: 8 },
      analyticsKind: "person_filter",
    };
  }
  if (role === "involved") {
    return {
      name: "list_risks",
      args: { personName: name, includeClosed: true, limit: 8 },
      analyticsKind: "person_filter",
    };
  }
  if (role === "raisedBy") {
    // Precise raiser language — execute path still falls back to owner if empty.
    return {
      name: "list_risks",
      args: { raisedByName: name, includeClosed: true, limit: 8 },
      analyticsKind: "person_filter",
    };
  }
  return {
    name: "list_risks",
    args: { ownerName: name, includeClosed: true, limit: 8 },
    analyticsKind: "person_filter",
  };
}

export function resolveForcedTool(
  message: string,
  intent: AiChatIntent
): ForcedAliceTool | null {
  const personTool = resolvePersonForcedTool(intent);
  if (personTool) return personTool;

  const kind = detectAnalyticsKind(message, intent);
  if (!kind) return null;

  switch (kind) {
    case "oldest_risk":
      return {
        name: "analytics_risks",
        args: { metric: "oldest_raised", includeClosed: true, limit: 1 },
        analyticsKind: kind,
      };
    case "newest_risk":
      return {
        name: "analytics_risks",
        args: { metric: "newest_raised", includeClosed: true, limit: 1 },
        analyticsKind: kind,
      };
    case "highest_risk":
      return {
        name: "analytics_risks",
        args: { metric: "highest_score", includeClosed: false, limit: 3 },
        analyticsKind: kind,
      };
    case "risk_counts":
      return {
        name: "analytics_risks",
        args: { metric: "counts_by_status", includeClosed: true },
        analyticsKind: kind,
      };
    case "compliance_concerns":
      return {
        name: "analytics_compliance",
        args: { focus: "gaps", limit: 8 },
        analyticsKind: kind,
      };
    case "org_health":
      return {
        name: "analytics_org_health",
        args: { limit: 5 },
        analyticsKind: kind,
      };
    default:
      return null;
  }
}

/** Alternate tool when the first retrieval returns empty. */
export function emptyRetryTool(
  forced: ForcedAliceTool | null,
  intent: AiChatIntent
): ForcedAliceTool | null {
  if (forced?.analyticsKind === "person_filter") {
    const name =
      (typeof forced.args.raisedByName === "string" &&
        forced.args.raisedByName) ||
      (typeof forced.args.ownerName === "string" && forced.args.ownerName) ||
      (typeof forced.args.personName === "string" && forced.args.personName) ||
      intent.filters.personName;
    if (!name || typeof name !== "string") return null;
    // Precise role already empty (execute also tries sibling once) — broaden
    // to multi-role involvement. Avoid raiser↔owner ping-pong.
    if (forced.args.personName) return null;
    return {
      name: "list_risks",
      args: { personName: name, includeClosed: true, limit: 8 },
      analyticsKind: "person_filter",
    };
  }
  if (forced?.name === "analytics_compliance") {
    return {
      name: "list_compliance",
      args: { selectedOnly: true, notImplementedOnly: true, limit: 10 },
      analyticsKind: "compliance_concerns",
    };
  }
  if (forced?.name === "analytics_risks") {
    return {
      name: "list_risks",
      args: {
        sortBy: "raisedOn",
        sortDir: "asc",
        includeClosed: true,
        limit: 5,
      },
      analyticsKind: forced.analyticsKind,
    };
  }
  if (intent.primaryModule === "compliance") {
    return {
      name: "list_compliance",
      args: { selectedOnly: true, notImplementedOnly: true, limit: 10 },
      analyticsKind: "compliance_concerns",
    };
  }
  if (intent.primaryModule === "risks") {
    return {
      name: "list_risks",
      args: { includeClosed: true, sortBy: "raisedOn", sortDir: "asc", limit: 8 },
      analyticsKind: "oldest_risk",
    };
  }
  return null;
}
