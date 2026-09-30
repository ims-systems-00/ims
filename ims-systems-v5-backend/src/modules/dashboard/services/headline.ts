/**
 * Live dashboard headline calculations (V4 globalStats formulae).
 */

import type {
  OrganisationalState,
  DashboardHeadline,
  DashboardModuleStats,
} from "../types";

export function deriveOrganisationalState(
  totalRisks: number,
  mitigatedRisks: number
): OrganisationalState {
  if (totalRisks <= 0) return "Safe";
  const mitigationPercentage = Math.round(
    (100 * mitigatedRisks) / totalRisks
  );
  if (mitigationPercentage > 80) return "Safe";
  if (mitigationPercentage > 60) return "Secure";
  if (mitigationPercentage > 40) return "Unsecure";
  if (mitigationPercentage > 20) return "Vulnerable";
  return "Hazardous";
}

/**
 * V4 organisationalConfidence: up to 5 points for presence of
 * assets, risks, audits, completed audits, completed management reviews.
 */
export function deriveOrganisationalConfidence(
  modules: DashboardModuleStats
): number {
  let points = 0;
  if ((modules.inventory?.totalCount ?? 0) > 0) points += 1;
  if ((modules.risks?.total ?? 0) > 0) points += 1;
  if ((modules.audits?.total ?? 0) > 0) points += 1;
  if ((modules.audits?.completed ?? 0) > 0) points += 1;
  if ((modules.managementReviews?.completed ?? 0) > 0) points += 1;
  return Math.round((100 * points) / 5);
}

export function buildHeadline(modules: DashboardModuleStats): DashboardHeadline {
  const risks = modules.risks;
  return {
    organisationalConfidence: deriveOrganisationalConfidence(modules),
    organisationalState: deriveOrganisationalState(
      risks?.total ?? 0,
      risks?.mitigated ?? 0
    ),
    criticalArea: null,
  };
}
