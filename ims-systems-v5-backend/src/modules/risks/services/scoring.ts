/**
 * Pure risk scoring helpers (service-layer business rules).
 * Spec: score = likelihood × consequence; typical range 1–5.
 */

import { ValidationAppError } from "../../../shared";
import type { RiskScorePair } from "../types";

export const SCORE_MIN = 1;
export const SCORE_MAX = 5;

export function assertScoreComponent(
  value: number,
  field: "likelihood" | "consequence"
): void {
  if (!Number.isInteger(value) || value < SCORE_MIN || value > SCORE_MAX) {
    throw new ValidationAppError(
      `${field} must be an integer between ${SCORE_MIN} and ${SCORE_MAX}`
    );
  }
}

export function calculateScore(
  likelihood: number,
  consequence: number
): RiskScorePair {
  assertScoreComponent(likelihood, "likelihood");
  assertScoreComponent(consequence, "consequence");
  return {
    likelihood,
    consequence,
    total: likelihood * consequence,
  };
}
