import { getSetupStep } from "../catalog";
import { useSetupOutcomeListener } from "../hooks/use-setup-outcome";
import { useSetupSeed } from "../hooks/use-setup-seed";
import { useSetupGuideStore } from "../store";
import { AliceAuditAssistSheet } from "./alice-audit-assist-sheet";
import { AliceDocsAssistSheet } from "./alice-docs-assist-sheet";
import { AliceLinkAssistSheet } from "./alice-link-assist-sheet";
import { AliceOrgAssistSheet } from "./alice-org-assist-sheet";
import { AliceProactiveAssistSheet } from "./alice-proactive-assist-sheet";
import { AliceRemoteAssistSheet } from "./alice-remote-assist-sheet";
import { AliceReviewAssistSheet } from "./alice-review-assist-sheet";
import { AliceRiskAssistSheet } from "./alice-risk-assist-sheet";
import { AliceSoaAssistSheet } from "./alice-soa-assist-sheet";
import { SetupChecklistCard } from "./setup-checklist-card";
import { SetupGuidePanel } from "./setup-guide-panel";
import { SetupSpotlight } from "./setup-spotlight";

/**
 * Shell host: checklist modal + coach panel + spotlight + Alice assist. Mount once.
 */
export function SetupGuideHost() {
  useSetupOutcomeListener();
  useSetupSeed();

  const activeStepId = useSetupGuideStore((s) => s.activeStepId);
  const subIndex = useSetupGuideStore((s) => s.subIndex);
  const aliceAssistOpen = useSetupGuideStore((s) => s.aliceAssistOpen);
  const seedPending = useSetupGuideStore((s) => s.seedPending);
  const step = activeStepId ? getSetupStep(activeStepId) : undefined;
  const sub = step?.guide.subs[subIndex];
  // Keep the docked coach panel visible (it slides left over open drawers).
  // Pause spotlight while seeding or while Alice / sheets sit on top.
  const spotlightActive = Boolean(
    step && !aliceAssistOpen && !seedPending && sub?.target
  );

  return (
    <>
      <SetupChecklistCard />
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
      <AliceAuditAssistSheet />
      <AliceReviewAssistSheet />
      <AliceRemoteAssistSheet />
      <AliceProactiveAssistSheet />
    </>
  );
}
