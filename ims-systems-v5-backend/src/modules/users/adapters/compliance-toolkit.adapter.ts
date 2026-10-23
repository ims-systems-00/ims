/**
 * Real ComplianceToolkitPort (U-07) — persists per-member compliance
 * toolkit grants on the organisation membership, validated against
 * the organisation's licensed toolkits (`licences.complianceTools`).
 * Wired in auth0-openfga mode; development-stub keeps the NoOp.
 */

import { NotFoundError, ValidationAppError } from "../../../shared";
import { createOrganisationMembershipRepository } from "../../organisation/repositories/organisation-membership.repository";
import { createOrganisationRepository } from "../../organisation/repositories/organisation.repository";
import type { ComplianceToolkitPort } from "../ports";

export function createComplianceToolkitAdapter(): ComplianceToolkitPort {
  const memberships = createOrganisationMembershipRepository();
  const organisations = createOrganisationRepository();

  return {
    async assignToolkits({ organizationId, userId, toolkitIds }) {
      const requested = [...new Set(toolkitIds.map((id) => id.trim()).filter(Boolean))];

      const organisation = await organisations.findById(organizationId);
      if (!organisation) {
        throw new NotFoundError("Organisation not found");
      }

      const licensed = new Set(organisation.licences.complianceTools ?? []);
      const unlicensed = requested.filter((id) => !licensed.has(id));
      if (unlicensed.length > 0) {
        throw new ValidationAppError(
          `Toolkits not licensed for this organisation: ${unlicensed.join(", ")}`
        );
      }

      const updated = await memberships.setComplianceToolkits(
        userId,
        organizationId,
        requested
      );
      if (!updated) {
        throw new NotFoundError("User is not a member of this organisation");
      }
    },
  };
}
