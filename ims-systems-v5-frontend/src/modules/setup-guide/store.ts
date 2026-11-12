import { create } from "zustand";
import { getTourById } from "./catalog";

const COMPLETED_STORAGE_KEY = "ims.setup-guide.completed";

function readCompleted(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(COMPLETED_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, boolean>;
  } catch {
    return {};
  }
}

function writeCompleted(map: Record<string, boolean>) {
  try {
    localStorage.setItem(COMPLETED_STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * Setup Guide session state.
 *
 * React Joyride owns step sequencing (it runs uncontrolled); this store holds
 * what the rest of the app needs to share with it: which tour is running,
 * which in-app actions have happened, and which steps could not find their
 * control. `stepIndex` is a read-only mirror of Joyride's position.
 */
type SetupGuideState = {
  pickerOpen: boolean;
  activeTourId: string | null;
  /** Bumped on every start so each run gets a fresh Joyride instance. */
  runId: number;
  stepIndex: number;
  /** In-app actions signalled during the current run, by event name. */
  completedEvents: Record<string, true>;
  /** Steps whose control was not on screen, by step id. */
  missingSteps: Record<string, true>;
  completedTours: Record<string, boolean>;
  openPicker: () => void;
  closePicker: () => void;
  startTour: (tourId: string) => void;
  /** Leave the tour without marking it completed. */
  exitTour: () => void;
  /** Leave the tour and record it as completed. */
  finishTour: () => void;
  setStepIndex: (index: number) => void;
  signalAction: (eventName: string) => void;
  clearAction: (eventName: string) => void;
  setStepMissing: (stepId: string, missing: boolean) => void;
  markTourCompleted: (tourId: string) => void;
};

const idleSession = {
  activeTourId: null,
  stepIndex: 0,
  completedEvents: {},
  missingSteps: {},
} as const;

export const useSetupGuideStore = create<SetupGuideState>((set, get) => ({
  pickerOpen: false,
  runId: 0,
  ...idleSession,
  completedTours: typeof window !== "undefined" ? readCompleted() : {},

  openPicker: () => set({ pickerOpen: true }),
  closePicker: () => set({ pickerOpen: false }),

  startTour: (tourId) => {
    if (!getTourById(tourId)) return;
    set((state) => ({
      ...idleSession,
      pickerOpen: false,
      activeTourId: tourId,
      runId: state.runId + 1,
    }));
  },

  exitTour: () => set({ ...idleSession }),

  finishTour: () => {
    const { activeTourId, markTourCompleted } = get();
    if (activeTourId) markTourCompleted(activeTourId);
    set({ ...idleSession });
  },

  setStepIndex: (index) => {
    if (!Number.isFinite(index) || index < 0) return;
    const next = Math.floor(index);
    if (get().stepIndex !== next) set({ stepIndex: next });
  },

  signalAction: (eventName) => {
    const key = eventName.trim();
    // Modules signal unconditionally; only a running tour listens.
    if (!key || !get().activeTourId || get().completedEvents[key]) return;
    set((state) => ({
      completedEvents: { ...state.completedEvents, [key]: true },
    }));
  },

  clearAction: (eventName) => {
    const key = eventName.trim();
    if (!key || !get().completedEvents[key]) return;
    set((state) => {
      const next = { ...state.completedEvents };
      delete next[key];
      return { completedEvents: next };
    });
  },

  setStepMissing: (stepId, missing) => {
    const current = Boolean(get().missingSteps[stepId]);
    if (current === missing) return;
    set((state) => {
      const next = { ...state.missingSteps };
      if (missing) next[stepId] = true;
      else delete next[stepId];
      return { missingSteps: next };
    });
  },

  markTourCompleted: (tourId) => {
    set((state) => {
      const completedTours = { ...state.completedTours, [tourId]: true };
      writeCompleted(completedTours);
      return { completedTours };
    });
  },
}));

/** Imperative helper for modules that should not import the hook. */
export function signalTourAction(eventName: string) {
  useSetupGuideStore.getState().signalAction(eventName);
}
