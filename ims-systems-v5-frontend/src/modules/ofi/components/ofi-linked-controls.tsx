import { LinkedControlsPanel } from "@/modules/compliance";
import { useSetOfiComplianceLinksMutation } from "../hooks/use-ofi";
import type { Ofi } from "../types";

type OfiLinkedControlsProps = {
  ofi: Ofi;
  /** Hide link/unlink when OFI is implemented. */
  canEdit?: boolean;
};

/**
 * OFI Linked controls tab — thin wrapper around the shared compliance panel.
 */
export function OfiLinkedControls({
  ofi,
  canEdit = true,
}: OfiLinkedControlsProps) {
  const mutation = useSetOfiComplianceLinksMutation(ofi.id);

  return (
    <LinkedControlsPanel
      links={ofi.complianceLinks}
      canEdit={canEdit}
      pending={mutation.isPending}
      entityLabel="OFI"
      lockedMessage="Linked controls cannot be changed while the OFI is implemented."
      onSave={async (links) => {
        await mutation.mutateAsync(links);
      }}
    />
  );
}
