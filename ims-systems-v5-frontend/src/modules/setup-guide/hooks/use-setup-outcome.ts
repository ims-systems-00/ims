import { useEffect } from "react";
import { getSetupStep } from "../catalog";
import { useSetupGuideStore } from "../store";

/**
 * When a domain event matching the active (or any) step's `completeOn` fires,
 * mark that step done. Also advances the coach when the current sub waits for
 * an event — handled inside the store's `signalEvent`.
 *
 * This hook exists so the host can react (e.g. toast) if needed later; finish
 * itself is already applied in the store.
 */
export function useSetupOutcomeListener() {
  const events = useSetupGuideStore((s) => s.events);
  const activeStepId = useSetupGuideStore((s) => s.activeStepId);
  const finishStep = useSetupGuideStore((s) => s.finishStep);
  const completedSteps = useSetupGuideStore((s) => s.completedSteps);

  useEffect(() => {
    if (!activeStepId) return;
    const step = getSetupStep(activeStepId);
    if (!step?.completeOn) return;
    if (completedSteps[step.id]) return;
    if (events[step.completeOn]) {
      finishStep(step.id);
    }
  }, [activeStepId, completedSteps, events, finishStep]);
}
