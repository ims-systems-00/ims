import { LinkedControlsPanel } from "@/modules/compliance";
import { useSetAuditComplianceLinksMutation } from "../hooks/use-audits";
import type { Audit } from "../types";

type AuditLinkedControlsProps = {
  audit: Audit;
  /** Hide link/unlink when audit is completed. */
  canEdit?: boolean;
};

/**
 * Audit Linked controls tab — thin wrapper around the shared compliance panel.
 */
export function AuditLinkedControls({
  audit,
  canEdit = true,
}: AuditLinkedControlsProps) {
  const mutation = useSetAuditComplianceLinksMutation(audit.id);

  return (
    <LinkedControlsPanel
      links={audit.complianceLinks}
      canEdit={canEdit}
      pending={mutation.isPending}
      entityLabel="audit"
      lockedMessage="Linked controls cannot be changed while the audit is completed."
      onSave={async (links) => {
        await mutation.mutateAsync(links);
      }}
    />
  );
}
