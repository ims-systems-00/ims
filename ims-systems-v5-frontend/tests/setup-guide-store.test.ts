import { beforeEach, describe, expect, it } from "vitest";
import {
  completedCount,
  nextUndoneStepId,
  useSetupGuideStore,
} from "@/modules/setup-guide/store";

function resetStore() {
  useSetupGuideStore.setState({
    checklistHidden: false,
    activeStepId: null,
    subIndex: 0,
    completedSteps: {},
    events: {},
    aliceAssistOpen: false,
    lastDocumentContext: null,
    lastControlContext: null,
    lastRiskContext: null,
    lastAuditContext: null,
    lastRepositoryContext: null,
    seedPending: false,
    focusChecklistToken: 0,
  });
  try {
    localStorage.removeItem("ims.setup-guide.progress");
    localStorage.removeItem("ims.setup-guide.hidden");
  } catch {
    /* ignore */
  }
}

describe("useSetupGuideStore", () => {
  beforeEach(resetStore);

  it("starts the org step and advances on create-opened", () => {
    useSetupGuideStore.getState().startStep("organisation");
    expect(useSetupGuideStore.getState().activeStepId).toBeNull();

    useSetupGuideStore.getState().startStep("org");
    expect(useSetupGuideStore.getState().activeStepId).toBe("org");
    expect(useSetupGuideStore.getState().subIndex).toBe(0);
    expect(useSetupGuideStore.getState().checklistHidden).toBe(true);

    useSetupGuideStore.getState().setSubIndex(1);
    useSetupGuideStore.getState().signalEvent("org.fu.create-opened");
    expect(useSetupGuideStore.getState().subIndex).toBe(2);
  });

  it("finishes org when a unit is created", () => {
    useSetupGuideStore.getState().startStep("org");
    useSetupGuideStore.getState().signalEvent("org.fu.created");
    const state = useSetupGuideStore.getState();
    expect(state.completedSteps.org).toBe(true);
    expect(state.activeStepId).toBeNull();
    expect(state.checklistHidden).toBe(false);
  });

  it("finishes org from Alice even when the guide is closed", () => {
    useSetupGuideStore.getState().signalEvent("org.fu.created");
    expect(useSetupGuideStore.getState().completedSteps.org).toBe(true);
  });

  it("tracks next undone and completed count", () => {
    expect(nextUndoneStepId({})).toBe("org");
    expect(completedCount({})).toBe(0);
    useSetupGuideStore.getState().finishStep("org");
    expect(nextUndoneStepId(useSetupGuideStore.getState().completedSteps)).toBe(
      "docs"
    );
    useSetupGuideStore.getState().finishStep("docs");
    useSetupGuideStore.getState().finishStep("link");
    expect(nextUndoneStepId(useSetupGuideStore.getState().completedSteps)).toBe(
      "soa"
    );
    useSetupGuideStore.getState().finishStep("soa");
    useSetupGuideStore.getState().finishStep("risk");
    expect(nextUndoneStepId(useSetupGuideStore.getState().completedSteps)).toBe(
      "audit"
    );
    useSetupGuideStore.getState().finishStep("audit");
    useSetupGuideStore.getState().finishStep("review");
    expect(nextUndoneStepId(useSetupGuideStore.getState().completedSteps)).toBe(
      "remote"
    );
    useSetupGuideStore.getState().finishStep("remote");
    useSetupGuideStore.getState().finishStep("alice");
    expect(nextUndoneStepId(useSetupGuideStore.getState().completedSteps)).toBeNull();
    expect(completedCount(useSetupGuideStore.getState().completedSteps)).toBe(9);
  });

  it("hides and restores the checklist", () => {
    useSetupGuideStore.getState().hideChecklist();
    expect(useSetupGuideStore.getState().checklistHidden).toBe(true);
    useSetupGuideStore.getState().openChecklist();
    expect(useSetupGuideStore.getState().checklistHidden).toBe(false);
    expect(useSetupGuideStore.getState().focusChecklistToken).toBe(1);
  });
});
