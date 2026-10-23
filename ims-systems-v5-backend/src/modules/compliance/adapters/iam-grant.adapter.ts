/**
 * Real ComplianceIamGrantPort (N-10) — when a compliance toolkit is
 * provisioned for an organisation, grant it to the provisioning
 * member's toolkit assignments (organisation membership record).
 * Per-user assignment for everyone else goes through the Users
 * Tool Access flow (U-07, same membership field).
 */

import { createOrganisationMembershipRepository } from "../../organisation/repositories/organisation-membership.repository";
import type { ComplianceIamGrantPort } from "../ports";

export function createComplianceIamGrantAdapter(): ComplianceIamGrantPort {
  const memberships = createOrganisationMembershipRepository();

  return {
    async grantToolkitAccess({ organizationId, toolkitName, actorId }) {
      if (!actorId) return;
      await memberships.addComplianceToolkit(
        actorId,
        organizationId,
        toolkitName
      );
    },
  };
}
