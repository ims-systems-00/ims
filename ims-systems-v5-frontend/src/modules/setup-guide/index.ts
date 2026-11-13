/**
 * Setup Guide — interactive get-set-up (setupux-inspired).
 *
 * - `SetupChecklistCard` large popup (navbar / sidebar open).
 * - `SetupGuideHost` in the app shell (checklist modal, coach, spotlight, Alice).
 * - Modules mark controls with `data-tour="…"` and report outcomes with
 *   `useSetupSignal` / `signalSetupEvent`.
 */

export { SetupChecklistCard } from "./components/setup-checklist-card";
export { SetupGuideHost } from "./components/setup-guide-host";
export { SetupSidebarEntry } from "./components/setup-sidebar-entry";
export { useSetupSignal, useTourAction } from "./hooks/use-setup-signal";
export {
  signalSetupEvent,
  signalTourAction,
  useSetupGuideStore,
  nextUndoneStepId,
  completedCount,
} from "./store";
export {
  SETUP_STEPS,
  SETUP_GUIDE_TITLE,
  ALICE_MONDAY_QUESTION,
  getSetupStep,
  listAvailableSteps,
} from "./catalog";
export type {
  SetupStepDefinition,
  SetupSubStep,
  AliceDraftUnit,
  AliceDraftInvite,
  AliceDraftPremise,
} from "./types";
