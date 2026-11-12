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
  // Keep the docked coach panel visible (it slides left over open drawers).
  // Pause only the spotlight dim so it does not sit on top of Alice / sheets.
  const spotlightActive = Boolean(step && !aliceAssistOpen && sub?.target);

  return (
    <>
      <SetupSpotlight
        active={spotlightActive}
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
