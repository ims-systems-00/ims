import { LinkedControlsPanel } from "@/modules/compliance";
import { useSetIncidentComplianceLinksMutation } from "../hooks/use-incidents";
import type { Incident } from "../types";

type IncidentLinkedControlsProps = {
  incident: Incident;
  /** Hide link/unlink when incident is resolved. */
  canEdit?: boolean;
};

/**
 * Incident Linked controls tab — thin wrapper around the shared compliance panel.
 */
export function IncidentLinkedControls({
  incident,
  canEdit = true,
}: IncidentLinkedControlsProps) {
  const mutation = useSetIncidentComplianceLinksMutation(incident.id);

  return (
    <LinkedControlsPanel
      links={incident.complianceLinks}
      canEdit={canEdit}
      pending={mutation.isPending}
      entityLabel="incident"
      lockedMessage="Linked controls cannot be changed while the incident is resolved."
      onSave={async (links) => {
        await mutation.mutateAsync(links);
      }}
    />
  );
}
