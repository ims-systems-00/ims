/**
 * Shared stats calculations (V4 globalStats formulae).
 */

import type { OrganisationalState } from "../types";

export function deriveOrganisationalState(
  totalRisks: number,
  mitigatedRisks: number
): OrganisationalState {
  if (totalRisks <= 0) return "Safe";
  const pct = Math.round((100 * mitigatedRisks) / totalRisks);
  if (pct > 80) return "Safe";
  if (pct > 60) return "Secure";
  if (pct > 40) return "Unsecure";
  if (pct > 20) return "Vulnerable";
  return "Hazardous";
}

/**
 * Five binary presence checks → 0–100 confidence.
 */
export function deriveOrganisationalConfidence(input: {
  hasAssets: boolean;
  hasRisks: boolean;
  hasAudits: boolean;
  hasCompletedAudits: boolean;
  hasCompletedManagementReviews: boolean;
}): number {
  let points = 0;
  if (input.hasAssets) points += 1;
  if (input.hasRisks) points += 1;
  if (input.hasAudits) points += 1;
  if (input.hasCompletedAudits) points += 1;
  if (input.hasCompletedManagementReviews) points += 1;
  return Math.round((100 * points) / 5);
}

export function maturityScoreFromUtilisation(
  userCount: number,
  utilisationPercentage: number
): 1 | 2 | 3 | 4 {
  if (userCount <= 0) return 1;
  if (utilisationPercentage <= 0) return 2;
  if (utilisationPercentage <= 80) return 3;
  return 4;
}

export function supplierRiskLevel(percentage: number): OrganisationalState {
  if (percentage <= 20) return "Hazardous";
  if (percentage <= 40) return "Vulnerable";
  if (percentage <= 60) return "Unsecure";
  if (percentage <= 80) return "Secure";
  return "Safe";
}
