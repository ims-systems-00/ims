/**
 * Real MembershipLookupPort — org memberships from Mongo (auth0-openfga).
 */

import { createOrganisationMembershipRepository } from "../../organisation/repositories/organisation-membership.repository";
import type { MembershipLookupPort } from "../ports";
import type {
  OrgMembershipView,
  UpdateEmploymentInput,
} from "../types";

function emptyShift() {
  return {
    timezone: "UTC",
    monday: null,
    tuesday: null,
    wednesday: null,
    thursday: null,
    friday: null,
    saturday: null,
    sunday: null,
  };
}

function toView(row: {
  userId: string;
  role: string;
  jobTitle?: string;
  workLocationType?: string;
  salary?: number;
  country?: { name: string; code: string };
  leaveDaysEntitled?: number;
  toilBalance?: number;
  lineManagerIds?: string[];
  workShift?: OrgMembershipView["workShift"];
}): OrgMembershipView {
  return {
    userId: row.userId,
    role: row.role,
    jobTitle: row.jobTitle?.trim() ? row.jobTitle : "Not set",
    salary: row.salary ?? 0,
    workLocationType: row.workLocationType ?? "On-site",
    country: row.country?.name ?? "United Kingdom",
    countryCode: row.country?.code ?? "GB",
    leaveDaysEntitled: row.leaveDaysEntitled ?? 0,
    toilBalance: row.toilBalance ?? 0,
    groupIds: [],
    lineManagerIds: row.lineManagerIds ?? [],
    workShift: row.workShift ?? emptyShift(),
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
      return rows.map((row) => toView(row));
    },

    async findByOrganizationAndUser(organizationId, userId) {
      const row = await memberships.findByUserAndOrg(userId, organizationId);
      if (!row) return null;
      return toView(row);
    },

    async setLineManagerIds(organizationId, userId, lineManagerIds) {
      const row = await memberships.setLineManagerIds(
        userId,
        organizationId,
        lineManagerIds
      );
      if (!row) return null;
      return toView(row);
    },

    async updateEmployment(
      organizationId,
      userId,
      input: UpdateEmploymentInput
    ) {
      const row = await memberships.updateEmployment(userId, organizationId, {
        jobTitle: input.jobTitle,
        workLocationType: input.workLocationType,
        salary: input.salary,
        country: {
          name: input.countryName,
          code: input.countryCode,
        },
        leaveDaysEntitled: input.leaveDaysEntitled,
        lineManagerIds: input.lineManagerIds,
        workShift: input.workShift ?? undefined,
      });
      if (!row) return null;
      return toView(row);
    },
  };
}
