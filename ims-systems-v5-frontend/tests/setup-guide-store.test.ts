import { beforeEach, describe, expect, it } from "vitest";
import { getFlatTour } from "@/modules/setup-guide/catalog";
import { isStepLocked } from "@/modules/setup-guide/lib/gating";
import { useSetupGuideStore } from "@/modules/setup-guide/store";

function resetStore() {
  useSetupGuideStore.setState({
    pickerOpen: false,
    activeTourId: null,
    runId: 0,
    stepIndex: 0,
    completedEvents: {},
    missingSteps: {},
    completedTours: {},
  });
}

describe("useSetupGuideStore", () => {
  beforeEach(resetStore);

  it("starts a tour and resets session events", () => {
    useSetupGuideStore.getState().signalAction("stale:event");
    // No active tour → signal ignored
    expect(useSetupGuideStore.getState().completedEvents).toEqual({});

    useSetupGuideStore.getState().startTour("organisation");
    const state = useSetupGuideStore.getState();
    expect(state.activeTourId).toBe("organisation");
    expect(state.stepIndex).toBe(0);
    expect(state.runId).toBe(1);
    expect(state.pickerOpen).toBe(false);
    expect(state.completedEvents).toEqual({});
    expect(state.missingSteps).toEqual({});
  });

  it("records in-app actions only while a tour is running", () => {
    useSetupGuideStore.getState().signalAction("org.fu.create-opened");
    expect(useSetupGuideStore.getState().completedEvents).toEqual({});

    useSetupGuideStore.getState().startTour("organisation");
    useSetupGuideStore.getState().signalAction("org.fu.create-opened");
    expect(useSetupGuideStore.getState().completedEvents).toEqual({
      "org.fu.create-opened": true,
    });
  });

  it("locks action steps until waitFor fires", () => {
    const flat = getFlatTour("organisation");
    expect(flat).toBeTruthy();
    const action = flat!.steps.find(
      (step) => step.kind === "action" && step.waitFor === "org.fu.create-opened"
    );
    expect(action).toBeTruthy();

    expect(isStepLocked(action!, {}, false)).toBe(true);
    expect(
      isStepLocked(action!, { "org.fu.create-opened": true }, false)
    ).toBe(false);
    // Missing control must not trap the user
    expect(isStepLocked(action!, {}, true)).toBe(false);
  });

  it("exits without completing, finish marks completed", () => {
    useSetupGuideStore.getState().startTour("organisation");
    useSetupGuideStore.getState().signalAction("org.fu.create-opened");
    useSetupGuideStore.getState().exitTour();
    expect(useSetupGuideStore.getState().activeTourId).toBeNull();
    expect(useSetupGuideStore.getState().completedEvents).toEqual({});
    expect(useSetupGuideStore.getState().completedTours.organisation).toBeFalsy();

    useSetupGuideStore.getState().startTour("organisation");
    useSetupGuideStore.getState().finishTour();
    expect(useSetupGuideStore.getState().activeTourId).toBeNull();
    expect(useSetupGuideStore.getState().completedTours.organisation).toBe(true);
  });
});
