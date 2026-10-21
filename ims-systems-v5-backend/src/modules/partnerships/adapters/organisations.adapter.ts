/**
 * Partnership → Organisation/Membership adapters (repositories, matching
 * the compliance licence adapter pattern).
 */

import { createOrganisationMembershipRepository } from "../../organisation/repositories/organisation-membership.repository";
import { createOrganisationRepository } from "../../organisation/repositories/organisation.repository";
import type {
  PartnershipMembershipPort,
  PartnershipOrganisationPort,
} from "../ports";

export function createPartnershipOrganisationAdapter(): PartnershipOrganisationPort {
  const organisations = createOrganisationRepository();
  return {
    findById: (id) => organisations.findById(id),
    markAsPartner: (id) => organisations.markAsPartner(id),
    listByReferralSource: (code) => organisations.listByReferralSource(code),
  };
}

export function createPartnershipMembershipAdapter(): PartnershipMembershipPort {
  const memberships = createOrganisationMembershipRepository();
  return {
    async isMember(userId, organizationId) {
      const membership = await memberships.findByUserAndOrg(
        userId,
        organizationId
      );
      return membership !== null;
    },
  };
}
