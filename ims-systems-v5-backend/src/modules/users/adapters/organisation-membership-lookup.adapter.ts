/**
 * Real MembershipLookupPort — org memberships from Mongo (auth0-openfga).
 */

import { createOrganisationMembershipRepository } from "../../organisation/repositories/organisation-membership.repository";
import type { MembershipLookupPort } from "../ports";
import type { OrgMembershipView } from "../types";

function toView(input: {
  userId: string;
  role: string;
  jobTitle?: string;
}): OrgMembershipView {
  return {
    userId: input.userId,
    role: input.role,
    jobTitle: input.jobTitle?.trim() ? input.jobTitle : null,
    salary: null,
    groupIds: [],
    lineManagerIds: [],
  };
}

/**
 * Backs Users/FU/Tasks membership checks with organisation_memberships.
 */
export function createOrganisationMembershipLookupAdapter(): MembershipLookupPort {
  const memberships = createOrganisationMembershipRepository();

  return {
    async listByOrganization(organizationId) {
      const rows = await memberships.listByOrganization(organizationId);
      return rows.map((row) =>
        toView({
          userId: row.userId,
          role: row.role,
          jobTitle: row.jobTitle,
        })
      );
    },

    async findByOrganizationAndUser(organizationId, userId) {
      const row = await memberships.findByUserAndOrg(userId, organizationId);
      if (!row) return null;
      return toView({
        userId: row.userId,
        role: row.role,
        jobTitle: row.jobTitle,
      });
    },
  };
}
