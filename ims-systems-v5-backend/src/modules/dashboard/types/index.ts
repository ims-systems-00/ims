/**
 * Dashboard domain types.
 * Spec: docs/module-specifications/dashboard.md
 *
 * V5 Phase 1: live read/aggregation only (no persisted dashboard collection).
 */

import type { AuditStats } from "../../audits";
import type { InventoryStats } from "../../assets";
import type { IncidentStats } from "../../incidents";
import type { ManagementReviewStats } from "../../management-reviews";
import type { OfiStats } from "../../ofi";
import type { RiskStats } from "../../risks";
import type { SupplierStats } from "../../suppliers";

/** Authz resource (V4: IMS_SERVICES.DASHBOARD). */
export const DASHBOARD_RESOURCE = "dashboard";

export const ORGANISATIONAL_STATES = [
  "Safe",
  "Secure",
  "Unsecure",
  "Vulnerable",
  "Hazardous",
] as const;

export type OrganisationalState = (typeof ORGANISATIONAL_STATES)[number];

export type DashboardContext = "organisation" | "functional-unit";

export type DashboardModuleKey =
  | "risks"
  | "incidents"
  | "audits"
  | "ofi"
  | "suppliers"
  | "inventory"
  | "managementReviews"
  | "functionalUnits"
  | "users"
  | "businessPremises"
  | "tasks";

export type DashboardHeadline = {
  /** V4 globalStats: round(100 * points / 5) from module presence. */
  organisationalConfidence: number;
  /** Derived from risk mitigated/total (V4 globalStats thresholds). */
  organisationalState: OrganisationalState;
  /**
   * Highest-volume risk type — unavailable until Risks expose by-type stats.
   * Always null in Phase 1.
   */
  criticalArea: string | null;
};

export type DashboardCounts = {
  businessUnits: number;
  complianceBodies: number;
  /** Active Internal users (org list total when available). */
  staff: number;
  /**
   * Remote staff — Users list does not expose a remote filter on the public
   * stats surface; Phase 1 returns 0 unless a remote count port is wired.
   */
  remoteStaff: number;
  premises: number;
  /** Incomplete tasks (open to-do style count). */
  openTasks: number;
};

export type DashboardModuleStats = {
  risks: RiskStats | null;
  incidents: IncidentStats | null;
  audits: AuditStats | null;
  ofi: OfiStats | null;
  suppliers: SupplierStats | null;
  inventory: InventoryStats | null;
  managementReviews: ManagementReviewStats | null;
};

export type FunctionalUnitSummary = {
  id: string;
  name: string;
  accessType: string;
  reference: string;
};

/**
 * Live dashboard payload for organisation or functional-unit context.
 *
 * Module panels mirror public module stats endpoints. Metrics are informational
 * aggregates, not a persisted snapshot.
 */
export type LiveDashboard = {
  context: DashboardContext;
  accurateAs: string;
  organizationId: string;
  headline: DashboardHeadline;
  counts: DashboardCounts;
  modules: DashboardModuleStats;
  /** Modules that failed authorization or threw during aggregation. */
  unavailable: DashboardModuleKey[];
  /**
   * Present for functional-unit context. Phase 1 module stats remain
   * organisation-scoped (same as caller identity list-scope); unit is metadata.
   */
  functionalUnit?: FunctionalUnitSummary;
  /**
   * How module metrics were scoped.
   * - organisation: org-wide via identity
   * - identity-list-scope: module listScope (may equal org-wide in development)
   */
  metricScope: "organisation" | "identity-list-scope";
};

export type LiveDashboardQuery = {
  /** Optional ISO date bounds — reserved; Phase 1 ignores (no date filter on stats). */
  from?: string;
  to?: string;
};
