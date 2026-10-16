import { createOrganisationMembershipRepository } from "../../modules/organisation/repositories/organisation-membership.repository";
import { createOrganisationRepository } from "../../modules/organisation/repositories/organisation.repository";
import { createUserRepository } from "../../modules/users/repositories/user.repository";
import type { Auth0AuthenticatorLookups } from "./auth0-authenticator";

/**
 * Default Mongo-backed lookups for Auth0Authenticator.
 * Kept in security/ so the authenticator stays free of direct mongoose usage.
 */
export function createMongoAuth0Lookups(): Auth0AuthenticatorLookups {
  const users = createUserRepository();
  const organisations = createOrganisationRepository();
  const memberships = createOrganisationMembershipRepository();

  return {
    async findUserByAuth0SubjectId(auth0SubjectId) {
      const user = await users.findByAuth0SubjectId(auth0SubjectId);
      if (!user) return null;
      return {
        id: user.id,
        email: user.email,
        systemAccessStatus: user.systemAccess.status,
        lockedUntil: user.lockedUntil,
      };
    },

    async findOrganisationByAuth0OrganizationId(auth0OrganizationId) {
      const organisation =
        await organisations.findByAuth0OrganizationId(auth0OrganizationId);
      if (!organisation) return null;
      return {
        id: organisation.id,
        status: organisation.status,
      };
    },

    async hasMembership(userId, organizationId) {
      const membership = await memberships.findByUserAndOrg(
        userId,
        organizationId
      );
      return Boolean(membership);
    },
  };
}
