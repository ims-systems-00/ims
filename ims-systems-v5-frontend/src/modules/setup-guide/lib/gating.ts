import type { GuideStep } from "../types";

/**
 * An action step holds the guide until the user has done the thing in the app.
 * It never locks when its control is missing — there is nothing to act on, and
 * a guide the user cannot get past is worse than a skipped step.
 */
export function isStepLocked(
  step: GuideStep,
  completedEvents: Record<string, true>,
  missing: boolean
): boolean {
  if (step.kind !== "action" || missing) return false;
  return !(step.waitFor && completedEvents[step.waitFor]);
}

/** Event that moves the guide on by itself while this step is showing. */
export function advanceTrigger(step: GuideStep): string | undefined {
  return step.kind === "action" ? step.waitFor : step.advanceOn;
}
