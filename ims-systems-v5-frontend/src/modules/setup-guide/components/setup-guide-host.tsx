import { getSetupStep } from "../catalog";
import { useSetupOutcomeListener } from "../hooks/use-setup-outcome";
import { useSetupGuideStore } from "../store";
import { AliceDocsAssistSheet } from "./alice-docs-assist-sheet";
import { AliceLinkAssistSheet } from "./alice-link-assist-sheet";
import { AliceOrgAssistSheet } from "./alice-org-assist-sheet";
import { AliceRiskAssistSheet } from "./alice-risk-assist-sheet";
import { AliceSoaAssistSheet } from "./alice-soa-assist-sheet";
import { SetupGuidePanel } from "./setup-guide-panel";
import { SetupSpotlight } from "./setup-spotlight";

/**
 * Shell host: coach panel + spotlight + Alice assist sheets. Mount once.
 */
export function SetupGuideHost() {
  useSetupOutcomeListener();

  const activeStepId = useSetupGuideStore((s) => s.activeStepId);
  const subIndex = useSetupGuideStore((s) => s.subIndex);
  const aliceAssistOpen = useSetupGuideStore((s) => s.aliceAssistOpen);
  const step = activeStepId ? getSetupStep(activeStepId) : undefined;
  const sub = step?.guide.subs[subIndex];
  // Pause coach chrome while Alice's sheet is open so it isn't covered by
  // the spotlight dim / floating panel (sheet is z-50; guide was z-70).
  const coachActive = Boolean(step) && !aliceAssistOpen;

  return (
    <>
      <SetupSpotlight
        active={Boolean(coachActive && sub?.target)}
        selector={sub?.target}
        label={sub?.spotLabel}
        labelAbove={sub?.spotLabelAbove}
      />
      <SetupGuidePanel />
      <AliceOrgAssistSheet />
      <AliceDocsAssistSheet />
      <AliceLinkAssistSheet />
      <AliceSoaAssistSheet />
      <AliceRiskAssistSheet />
    </>
  );
}
