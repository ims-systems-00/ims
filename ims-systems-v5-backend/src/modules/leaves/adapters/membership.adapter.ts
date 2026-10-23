/**
 * Leaves → organisation membership / user profile adapter.
 */

import { createOrganisationMembershipRepository } from "../../organisation/repositories/organisation-membership.repository";
import type { MembershipLookupPort } from "../../users";
import { createUserRepository } from "../../users";
import { LEAVE_DEFAULT_COUNTRY, type LeaveCountry } from "../types";
import type { LeavesMembershipPort } from "../ports";

export function createLeavesMembershipAdapter(deps?: {
  /** Prefer Users membership lookup (Dev demo graph or OpenFGA org rows). */
  membershipLookup?: MembershipLookupPort;
}): LeavesMembershipPort {
  const memberships = createOrganisationMembershipRepository();
  const users = createUserRepository();
  const lookup = deps?.membershipLookup;

  return {
    async getProfile({ organizationId, userId }) {
      const [fromLookup, fromOrg, user] = await Promise.all([
        lookup
          ? lookup.findByOrganizationAndUser(organizationId, userId)
          : Promise.resolve(null),
        memberships.findByUserAndOrg(userId, organizationId),
        users.findById(userId),
      ]);
      const membershipCountryName =
        fromLookup?.country ?? fromOrg?.country?.name;
      const membershipCountryCode =
        fromLookup?.countryCode ?? fromOrg?.country?.code;
      const country: LeaveCountry = {
        name:
          membershipCountryName ||
          user?.country?.name ||
          LEAVE_DEFAULT_COUNTRY.name,
        code:
          membershipCountryCode ||
          user?.country?.code ||
          LEAVE_DEFAULT_COUNTRY.code,
      };
      const lineManagerIds =
        fromLookup?.lineManagerIds ?? fromOrg?.lineManagerIds ?? [];
      return {
        lineManagerIds: [...lineManagerIds],
        country,
      };
    },

    async listManagedUserIds({ organizationId, managerId }) {
      if (lookup) {
        const rows = await lookup.listByOrganization(organizationId);
        return rows
          .filter((row) => row.lineManagerIds?.includes(managerId))
          .map((row) => row.userId);
      }
      const rows = await memberships.listByLineManager(
        organizationId,
        managerId
      );
      return rows.map((row) => row.userId);
    },
  };
}
