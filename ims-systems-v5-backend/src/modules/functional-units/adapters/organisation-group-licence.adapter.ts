/**
 * Real GroupLicencePort (FU-01) — functional-unit creation checks and
 * consumes the organisation's `licences.groups` allocation.
 * Wired in auth0-openfga mode; development-stub keeps AlwaysAllow.
 *
 * Enforcement follows the invitations licence precedent: when the org
 * has no group allocation configured (allocated = 0, e.g. pre-Go Live),
 * creation is allowed but usage is still counted.
 */

import { createOrganisationRepository } from "../../organisation/repositories/organisation.repository";
import {
  InsufficientGroupLicenceError,
  type GroupLicencePort,
} from "../ports";

const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

export function createOrganisationGroupLicenceAdapter(): GroupLicencePort {
  const organisations = createOrganisationRepository();

  return {
    async assertCanCreateUnit(organizationId) {
      if (!OBJECT_ID_PATTERN.test(organizationId)) {
        throw new InsufficientGroupLicenceError(
          "Organisation context is required to check group licences."
        );
      }
      const organisation = await organisations.findById(organizationId);
      if (!organisation) {
        throw new InsufficientGroupLicenceError(
          "Organisation not found for group licence check."
        );
      }
      const { allocated, used } = organisation.licences.groups;
      if (allocated > 0 && used >= allocated) {
        throw new InsufficientGroupLicenceError();
      }
    },

    async consumeUnitLicence(organizationId) {
      if (!OBJECT_ID_PATTERN.test(organizationId)) return;
      await organisations.incrementGroupsUsed(organizationId, 1);
    },
  };
}
