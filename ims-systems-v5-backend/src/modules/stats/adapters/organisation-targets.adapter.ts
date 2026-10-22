/**
 * Real StatsOrganisationPort (N-17): incident resolution targets read
 * from the caller's organisation record (`incidentResolutionTargets`,
 * editable via PUT /organisations/current/incident-resolution-targets).
 */

import { createOrganisationRepository } from "../../organisation/repositories/organisation.repository";
import type { StatsOrganisationPort } from "../ports";

export function createOrganisationTargetsAdapter(deps?: {
  findTargets?: (
    organizationId: string,
  ) => Promise<Record<"P1" | "P2" | "P3" | "P4", number | null>>;
}): StatsOrganisationPort {
  const findTargets =
    deps?.findTargets ??
    (async (organizationId: string) => {
      const org = await createOrganisationRepository().findById(organizationId);
      return org?.incidentResolutionTargets ?? { P1: null, P2: null, P3: null, P4: null };
    });
  return {
    async incidentResolutionTargets(identity) {
      if (!identity.organizationId) {
        return { P1: null, P2: null, P3: null, P4: null };
      }
      return findTargets(identity.organizationId);
    },
  };
}
