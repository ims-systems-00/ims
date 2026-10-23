/**
 * Resource types enforced by OpenFGA under auth0-openfga (M7).
 * Org-level checks: every type maps actions to organization relations.
 */

export const ENFORCED_RESOURCE_TYPES: ReadonlySet<string> = new Set([
  "organisation",
  "functional-units",
  "users",
  "business-premises",
  "inventory",
  "risks",
  "incidents",
  "audits",
  "management-reviews",
  "kpi-objectives",
  "tags-and-categories",
  "document-management",
  "ofi",
  "compliance",
  "customers",
  "suppliers",
  "tasks",
  "calendar",
  "notifications",
  "activities",
  "charts",
  "dashboard",
  "stats",
  "leaves",
  "ai",
]);

/** @deprecated Use ENFORCED_RESOURCE_TYPES (M7). Kept for import compatibility. */
export const M6_ENFORCED_RESOURCE_TYPES = ENFORCED_RESOURCE_TYPES;

/** Resource types used for nav capability preflight (read checks). */
export const NAV_CAPABILITY_RESOURCE_TYPES: readonly string[] = [
  "organisation",
  "functional-units",
  "users",
  "business-premises",
  "inventory",
  "risks",
  "incidents",
  "audits",
  "management-reviews",
  "kpi-objectives",
  "tags-and-categories",
  "document-management",
  "ofi",
  "compliance",
  "customers",
  "suppliers",
  "tasks",
  "calendar",
  "leaves",
];
