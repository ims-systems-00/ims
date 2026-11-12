import { create } from "zustand";
import type { ComplianceToolkitName } from "@/modules/compliance/types";
import { getSetupStep, SETUP_STEPS } from "./catalog";

const PROGRESS_KEY = "ims.setup-guide.progress";
const HIDDEN_KEY = "ims.setup-guide.hidden";

function readDone(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, boolean>;
  } catch {
    return {};
  }
}

function writeDone(map: Record<string, boolean>) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(map));
  } catch {
    /* ignore quota / private mode */
  }
}

function readHidden(): boolean {
  try {
    return localStorage.getItem(HIDDEN_KEY) === "1";
  } catch {
    return false;
  }
}

function writeHidden(hidden: boolean) {
  try {
    if (hidden) localStorage.setItem(HIDDEN_KEY, "1");
    else localStorage.removeItem(HIDDEN_KEY);
  } catch {
    /* ignore */
  }
}

type SetupGuideState = {
  /** Dashboard checklist card is collapsed / hidden. */
  checklistHidden: boolean;
  /** Step currently being coached, or null. */
  activeStepId: string | null;
  /** 0-based sub-step index inside the active step. */
  subIndex: number;
  /** Completed steps by id. */
  completedSteps: Record<string, boolean>;
  /** Events signalled during the active guide (advance / complete). */
  events: Record<string, true>;
  /** Alice assist sheet open (org / docs / link). */
  aliceAssistOpen: boolean;
  /**
   * Last document Alice (or the user) created during setup — used by the
   * link-to-standards assist so it can deep-link without hunting.
   */
  lastDocumentContext: { repositoryId: string; nodeId: string } | null;
  /** Last compliance control opened/seeded for SoA coaching. */
  lastControlContext: {
    toolkitName: ComplianceToolkitName;
    controlId: string;
  } | null;
  /** Last risk opened/seeded for Analyse coaching. */
  lastRiskContext: { riskId: string } | null;
  /** Last internal audit opened/seeded for Assist coaching. */
  lastAuditContext: { auditId: string } | null;
  /** Last document repository opened/seeded for upload coaching. */
  lastRepositoryContext: { repositoryId: string } | null;
  /** True while seed-then-spotlight is creating/opening a record. */
  seedPending: boolean;
  /** Briefly true after navbar “open setup guide” so the card can scroll into view. */
  focusChecklistToken: number;

  hideChecklist: () => void;
  showChecklist: () => void;
  openChecklist: () => void;
  startStep: (stepId: string) => void;
  closeGuide: () => void;
  setSubIndex: (index: number) => void;
  advanceSub: () => void;
  finishStep: (stepId: string) => void;
  signalEvent: (eventName: string) => void;
  openAliceAssist: () => void;
  closeAliceAssist: () => void;
  setLastDocumentContext: (
    context: { repositoryId: string; nodeId: string } | null
  ) => void;
  setLastControlContext: (
    context: {
      toolkitName: ComplianceToolkitName;
      controlId: string;
    } | null
  ) => void;
  setLastRiskContext: (context: { riskId: string } | null) => void;
  setLastAuditContext: (context: { auditId: string } | null) => void;
  setLastRepositoryContext: (
    context: { repositoryId: string } | null
  ) => void;
  setSeedPending: (pending: boolean) => void;
};

export const useSetupGuideStore = create<SetupGuideState>((set, get) => ({
  checklistHidden: typeof window !== "undefined" ? readHidden() : false,
  activeStepId: null,
  subIndex: 0,
  completedSteps: typeof window !== "undefined" ? readDone() : {},
  events: {},
  aliceAssistOpen: false,
  lastDocumentContext: null,
  lastControlContext: null,
  lastRiskContext: null,
  lastAuditContext: null,
  lastRepositoryContext: null,
  seedPending: false,
  focusChecklistToken: 0,

  hideChecklist: () => {
    writeHidden(true);
    set({ checklistHidden: true });
  },

  showChecklist: () => {
    writeHidden(false);
    set({ checklistHidden: false });
  },

  openChecklist: () => {
    writeHidden(false);
    set((state) => ({
      checklistHidden: false,
      focusChecklistToken: state.focusChecklistToken + 1,
    }));
  },

  startStep: (stepId) => {
    const step = getSetupStep(stepId);
    if (!step || step.status !== "available") return;
    set({
      activeStepId: stepId,
      subIndex: 0,
      events: {},
      aliceAssistOpen: false,
      seedPending: false,
      checklistHidden: true,
    });
  },

  closeGuide: () =>
    set({
      activeStepId: null,
      subIndex: 0,
      events: {},
      aliceAssistOpen: false,
      seedPending: false,
    }),

  setSubIndex: (index) => {
    if (!Number.isFinite(index) || index < 0) return;
    set({ subIndex: Math.floor(index) });
  },

  advanceSub: () => {
    const { activeStepId, subIndex } = get();
    if (!activeStepId) return;
    const step = getSetupStep(activeStepId);
    if (!step) return;
    const last = step.guide.subs.length - 1;
    if (subIndex >= last) return;
    set({ subIndex: subIndex + 1 });
  },

  finishStep: (stepId) => {
    set((state) => {
      const completedSteps = { ...state.completedSteps, [stepId]: true };
      writeDone(completedSteps);
      return {
        completedSteps,
        activeStepId: state.activeStepId === stepId ? null : state.activeStepId,
        subIndex: state.activeStepId === stepId ? 0 : state.subIndex,
        events: state.activeStepId === stepId ? {} : state.events,
        aliceAssistOpen: false,
        checklistHidden: false,
      };
    });
  },

  signalEvent: (eventName) => {
    const key = eventName.trim();
    if (!key || get().events[key]) return;
    set((state) => ({
      events: { ...state.events, [key]: true },
    }));

    // Advance coach when the current sub waits for this event.
    const { activeStepId, subIndex, advanceSub, finishStep } = get();
    if (!activeStepId) {
      // Still allow completion when guide is closed (Alice assist path).
      const match = SETUP_STEPS.find((s) => s.completeOn === key);
      if (match && !get().completedSteps[match.id]) {
        finishStep(match.id);
      }
      return;
    }
    const step = getSetupStep(activeStepId);
    if (!step) return;
    const sub = step.guide.subs[subIndex];
    if (sub?.advanceOn === key) {
      if (subIndex >= step.guide.subs.length - 1 || step.completeOn === key) {
        if (step.completeOn === key) finishStep(step.id);
        else advanceSub();
      } else {
        advanceSub();
      }
    } else if (step.completeOn === key) {
      finishStep(step.id);
    }
  },

  openAliceAssist: () => set({ aliceAssistOpen: true }),
  closeAliceAssist: () => set({ aliceAssistOpen: false }),
  setLastDocumentContext: (context) => set({ lastDocumentContext: context }),
  setLastControlContext: (context) => set({ lastControlContext: context }),
  setLastRiskContext: (context) => set({ lastRiskContext: context }),
  setLastAuditContext: (context) => set({ lastAuditContext: context }),
  setLastRepositoryContext: (context) =>
    set({ lastRepositoryContext: context }),
  setSeedPending: (seedPending) => set({ seedPending }),
}));

/** Modules report UI / domain outcomes (create opened, record created, …). */
export function signalSetupEvent(eventName: string) {
  useSetupGuideStore.getState().signalEvent(eventName);
}

/** @deprecated Prefer `signalSetupEvent`. Kept for existing call sites. */
export function signalTourAction(eventName: string) {
  signalSetupEvent(eventName);
}

export function nextUndoneStepId(
  completed: Record<string, boolean>
): string | null {
  for (const step of SETUP_STEPS) {
    if (step.status !== "available") continue;
    if (!completed[step.id]) return step.id;
  }
  return null;
}

export function completedCount(completed: Record<string, boolean>): number {
  return SETUP_STEPS.filter((step) => completed[step.id]).length;
}
