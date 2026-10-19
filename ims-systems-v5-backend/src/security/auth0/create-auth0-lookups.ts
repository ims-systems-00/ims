import { createOrganisationMembershipRepository } from "../../modules/organisation/repositories/organisation-membership.repository";
import { createOrganisationRepository } from "../../modules/organisation/repositories/organisation.repository";
import { createUserRepository } from "../../modules/users/repositories/user.repository";
import type {
  Auth0AuthenticatorLookups,
  Auth0LinkedUser,
} from "./auth0-authenticator";

/** Sentinel hash — Auth0 owns credentials; local password login must never match. */
const AUTH0_EXTERNAL_PASSWORD_HASH = "!auth0-external!";

function splitName(name: string | undefined, email: string): {
  firstName: string;
  lastName: string;
} {
  const trimmed = name?.trim();
  if (trimmed) {
    const parts = trimmed.split(/\s+/);
    const firstName = parts[0] ?? "User";
    const lastName = parts.slice(1).join(" ") || "Account";
    return { firstName, lastName };
  }
  const local = email.split("@")[0]?.trim() || "user";
  return { firstName: local, lastName: "Account" };
}

function nextUserReference(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `USR-${stamp}-${rand}`;
}

function toLinked(user: {
  id: string;
  email: string;
  systemAccess: { status: string };
  lockedUntil: Date | null;
}): Auth0LinkedUser {
  return {
    id: user.id,
    email: user.email,
    systemAccessStatus: user.systemAccess.status,
    lockedUntil: user.lockedUntil,
  };
}

/**
 * Default Mongo-backed lookups for Auth0Authenticator.
 * Includes JIT user provisioning for self-signup (no prior invite / backfill).
 */
export function createMongoAuth0Lookups(): Auth0AuthenticatorLookups {
  const users = createUserRepository();
  const organisations = createOrganisationRepository();
  const memberships = createOrganisationMembershipRepository();

  return {
    async findUserByAuth0SubjectId(auth0SubjectId) {
      const user = await users.findByAuth0SubjectId(auth0SubjectId);
      if (!user) return null;
      return toLinked(user);
    },

    async ensureUserFromAuth0(input) {
      const existing = await users.findByAuth0SubjectId(input.auth0SubjectId);
      if (existing) return toLinked(existing);

      const email = (input.email ?? "").trim().toLowerCase();
      if (!email || !email.includes("@")) {
        return null;
      }

      const byEmail = await users.findByEmail(email);
      if (byEmail) {
        const linked = await users.linkAuth0SubjectId(
          byEmail.id,
          input.auth0SubjectId
        );
        return linked ? toLinked(linked) : toLinked(byEmail);
      }

      const { firstName, lastName } = splitName(input.name, email);
      const created = await users.create({
        reference: nextUserReference(),
        type: "Internal",
        firstName,
        lastName,
        email,
        passwordHash: AUTH0_EXTERNAL_PASSWORD_HASH,
        systemPasswordStatus: "active",
        systemAccessPeriod: "Full time",
        systemAccessExpires: null,
        createdBy: "auth0-jit",
      });
      const linked = await users.linkAuth0SubjectId(
        created.id,
        input.auth0SubjectId
      );
      return linked ? toLinked(linked) : toLinked(created);
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
