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

export function resolveForcedTool(
  message: string,
  intent: AiChatIntent
): ForcedAliceTool | null {
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
