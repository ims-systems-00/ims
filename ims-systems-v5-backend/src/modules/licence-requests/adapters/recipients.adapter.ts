/**
 * Licence request email recipients — org Super Admins via memberships,
 * organisation display name via the organisation repository.
 */

import { createOrganisationMembershipRepository } from "../../organisation/repositories/organisation-membership.repository";
import { createOrganisationRepository } from "../../organisation/repositories/organisation.repository";
import { createUserRepository } from "../../users/repositories/user.repository";
import type { LicenceRequestRecipientsPort } from "../ports";

export function createLicenceRequestRecipientsAdapter(): LicenceRequestRecipientsPort {
  const memberships = createOrganisationMembershipRepository();
  const organisations = createOrganisationRepository();
  const users = createUserRepository();

  return {
    async listSuperAdminEmails(organizationId: string): Promise<string[]> {
      const rows = await memberships.listByOrganization(organizationId);
      const superAdmins = rows.filter((row) => row.role === "Super Admin");
      const emails = new Set<string>();
      for (const membership of superAdmins) {
        const user = await users.findById(membership.userId).catch(() => null);
        if (user?.email) emails.add(user.email);
      }
      return [...emails];
    },

    async getOrganisationName(
      organizationId: string
    ): Promise<string | null> {
      const org = await organisations.findById(organizationId);
      return org?.name ?? null;
    },
  };
}
