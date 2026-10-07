import { LinkedControlsPanel } from "@/modules/compliance";
import { useSetRiskComplianceLinksMutation } from "../hooks/use-risks";
import type { Risk } from "../types";

type RiskLinkedControlsProps = {
  risk: Risk;
  /** Hide link/unlink when risk is mitigated. */
  canEdit?: boolean;
};

/**
 * Risk Linked controls tab — thin wrapper around the shared compliance panel.
 */
export function RiskLinkedControls({
  risk,
  canEdit = true,
}: RiskLinkedControlsProps) {
  const mutation = useSetRiskComplianceLinksMutation(risk.id);

  return (
    <LinkedControlsPanel
      links={risk.complianceLinks}
      canEdit={canEdit}
      pending={mutation.isPending}
      entityLabel="risk"
      lockedMessage="Linked controls cannot be changed while the risk is mitigated."
      onSave={async (links) => {
        await mutation.mutateAsync({ links });
      }}
    />
  );
}
