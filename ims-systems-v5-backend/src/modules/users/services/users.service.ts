import type { Authorizer, SecurityIdentity } from "../../../security";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationAppError,
} from "../../../shared";
import type {
  ComplianceToolkitPort,
  MembershipLookupPort,
  OwnershipIntegrityPort,
  SessionPort,
  UserNotificationPort,
} from "../ports";
import type { UserRepository } from "../repositories/user.repository";
import {
  generateTemporaryPassword,
  hashPassword,
  verifyPassword,
} from "./password";
import {
  USERS_RESOURCE,
  type AddWorkingLocationInput,
  type ChangePasswordInput,
  type ListUsersQuery,
  type OrgMembershipView,
  type OwnershipCheckResult,
  type PaginatedUsers,
  type ProvisionUserInput,
  type UpdatePreferencesInput,
  type UpdateProfileImageInput,
  type UpdateSignatureInput,
  type UpdateSystemAccessInput,
  type UpdateUserProfileInput,
  type User,
  type UserWithMembership,
} from "../types";

function requireOrgIdentity(identity: SecurityIdentity | null | undefined): {
  identity: SecurityIdentity;
  organizationId: string;
} {
  if (!identity?.subjectId) {
    throw new UnauthorizedError();
  }
  if (!identity.organizationId) {
    throw new ForbiddenError("Organisation context is required");
  }
  return { identity, organizationId: identity.organizationId };
}

function nextReference(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `USR-${stamp}-${rand}`;
}

function isSelf(
  identity: SecurityIdentity,
  user: Pick<User, "id" | "email">
): boolean {
  return (
    identity.subjectId === user.id ||
    (Boolean(identity.email) &&
      identity.email!.toLowerCase() === user.email.toLowerCase())
  );
}

function computeAccessExpiry(period: string, status: "Active" | "Blocked"): Date | null {
  if (status !== "Active") return null;
  if (!period || period === "Full time") return null;
  const days = Number.parseInt(period, 10);
  if (!Number.isFinite(days) || days <= 0) return null;
  return new Date(Date.now() + days * 86_400_000);
}

function matchesMembershipSearch(
  membership: OrgMembershipView,
  search: string
): boolean {
  const needle = search.toLowerCase();
  return (
    (membership.jobTitle ?? "").toLowerCase().includes(needle) ||
    (membership.workLocationType ?? "").toLowerCase().includes(needle) ||
    (membership.country ?? "").toLowerCase().includes(needle) ||
    membership.role.toLowerCase().includes(needle)
  );
}

export type UsersServiceDeps = {
  repository: UserRepository;
  authorizer: Authorizer;
  memberships: MembershipLookupPort;
  sessions: SessionPort;
  notifications: UserNotificationPort;
  ownership: OwnershipIntegrityPort;
  toolkits: ComplianceToolkitPort;
};

export function createUsersService(deps: UsersServiceDeps) {
  const {
    repository,
    authorizer,
    memberships,
    sessions,
    notifications,
    ownership,
    toolkits,
  } = deps;

  async function assertAllowed(
    identity: SecurityIdentity,
    action: string,
    resourceId?: string
  ): Promise<void> {
    const allowed = await authorizer.allow({
      identity,
      action,
      resourceType: USERS_RESOURCE,
      resourceId,
      organizationId: identity.organizationId,
    });
    if (!allowed) {
      throw new ForbiddenError(
        "User does not have permission to access users"
      );
    }
  }

  async function requireOrgMember(
    organizationId: string,
    userId: string
  ): Promise<OrgMembershipView> {
    const membership = await memberships.findByOrganizationAndUser(
      organizationId,
      userId
    );
    if (!membership) {
      throw new NotFoundError("User not found in organisation");
    }
    return membership;
  }

  async function withMembership(
    organizationId: string,
    user: User
  ): Promise<UserWithMembership> {
    const membership = await memberships.findByOrganizationAndUser(
      organizationId,
      user.id
    );
    return { user, membership };
  }

  async function changePasswordFor(
    userId: string,
    input: ChangePasswordInput
  ): Promise<void> {
    if (input.currentPassword === input.newPassword) {
      throw new ValidationAppError(
        "New password must be different from the current password"
      );
    }
    const stored = await repository.findPasswordHash(userId);
    if (!stored) {
      throw new NotFoundError("User not found");
    }
    const matches = await verifyPassword(input.currentPassword, stored);
    if (!matches) {
      throw new ValidationAppError("Current password is incorrect");
    }
    const passwordHash = await hashPassword(input.newPassword);
    const ok = await repository.updatePassword(userId, passwordHash, "blocked");
    if (!ok) {
      throw new ConflictError("Password could not be updated");
    }
  }

  return {
    /**
     * Direct HTTP create is blocked (invitation-based onboarding).
     * Provision remains available for Invitation/Auth modules via public API.
     */
    async rejectDirectCreate(): Promise<never> {
      throw new ValidationAppError(
        "Direct user creation is deprecated. Invite the person through the Invitations module."
      );
    },

    async provision(
      identity: SecurityIdentity | null | undefined,
      input: ProvisionUserInput
    ): Promise<User> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "create");

      const email = input.email.trim().toLowerCase();
      const existing = await repository.findByEmail(email);
      if (existing) {
        throw new ConflictError("User already exists");
      }

      const plainPassword = input.password ?? generateTemporaryPassword();
      const passwordHash = await hashPassword(plainPassword);
      const period = input.systemAccessPeriod ?? "Full time";

      return repository.create({
        ...input,
        email,
        reference: nextReference(),
        passwordHash,
        systemPasswordStatus: input.password ? "blocked" : "active",
        systemAccessPeriod: period,
        systemAccessExpires: computeAccessExpiry(period, "Active"),
        createdBy: input.createdBy ?? actor.identity.subjectId,
      });
    },

    async list(
      identity: SecurityIdentity | null | undefined,
      query: ListUsersQuery
    ): Promise<PaginatedUsers> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "read");

      const orgMemberships = await memberships.listByOrganization(
        actor.organizationId
      );

      let memberIds = orgMemberships.map((item) => item.userId);
      const membershipByUser = new Map(
        orgMemberships.map((item) => [item.userId, item])
      );

      if (query.search && query.search.length > 0) {
        const membershipMatches = new Set(
          orgMemberships
            .filter((item) => matchesMembershipSearch(item, query.search!))
            .map((item) => item.userId)
        );
        // Keep all member ids; repository search covers name/email.
        // Also include membership-field matches even if name/email miss.
        if (membershipMatches.size > 0) {
          memberIds = [
            ...new Set([...memberIds, ...membershipMatches]),
          ];
        }
      }

      const { items, total } = await repository.listActiveByIds(memberIds, {
        page: query.page,
        pageSize: query.pageSize,
        search: query.search,
      });

      // If search matched membership fields but not user fields, include those users.
      let resultItems = items;
      let resultTotal = total;
      if (query.search && query.search.length > 0 && items.length === 0) {
        const membershipMatchIds = orgMemberships
          .filter((item) => matchesMembershipSearch(item, query.search!))
          .map((item) => item.userId);
        if (membershipMatchIds.length > 0) {
          const fallback = await repository.listActiveByIds(membershipMatchIds, {
            page: query.page,
            pageSize: query.pageSize,
          });
          resultItems = fallback.items;
          resultTotal = fallback.total;
        }
      }

      return {
        items: resultItems.map((user) => ({
          user,
          membership: membershipByUser.get(user.id) ?? null,
        })),
        page: query.page,
        pageSize: query.pageSize,
        total: resultTotal,
        totalPages: Math.max(1, Math.ceil(resultTotal / query.pageSize) || 1),
      };
    },

    async getClassified(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<UserWithMembership> {
      const actor = requireOrgIdentity(identity);
      const user = await repository.findById(id);
      if (!user) {
        throw new NotFoundError("User not found");
      }

      const self = isSelf(actor.identity, user);
      if (!self) {
        await assertAllowed(actor.identity, "read", id);
        await requireOrgMember(actor.organizationId, id);
      } else {
        // Own profile: still require org membership when org context is present.
        await requireOrgMember(actor.organizationId, id);
      }

      return withMembership(actor.organizationId, user);
    },

    async getBasic(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<UserWithMembership> {
      // Spec: basic vs classified distinction is not materially enforced today.
      return this.getClassified(identity, id);
    },

    async updateProfile(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: UpdateUserProfileInput
    ): Promise<User> {
      const actor = requireOrgIdentity(identity);
      const user = await repository.findById(id);
      if (!user) {
        throw new NotFoundError("User not found");
      }

      const self = isSelf(actor.identity, user);
      if (!self) {
        await assertAllowed(actor.identity, "update", id);
        await requireOrgMember(actor.organizationId, id);
      }

      const firstName = input.firstName ?? user.firstName;
      const lastName = input.lastName ?? user.lastName;
      const updated = await repository.updateProfile(id, {
        firstName,
        lastName,
        name: `${firstName} ${lastName}`.trim(),
      });
      if (!updated) {
        throw new NotFoundError("User not found");
      }
      return updated;
    },

    async changePassword(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: ChangePasswordInput
    ): Promise<void> {
      const actor = requireOrgIdentity(identity);
      // Spec: operates on the session user (URL user id ignored for authz self).
      const targetId = actor.identity.subjectId;
      const user =
        (await repository.findById(targetId)) ??
        (actor.identity.email
          ? await repository.findByEmail(actor.identity.email)
          : null);
      if (!user) {
        // Fall back to path id when subject is not a persisted user (dev stub).
        const fallback = await repository.findById(id);
        if (!fallback || !isSelf(actor.identity, fallback)) {
          throw new ForbiddenError(
            "You can only change your own password"
          );
        }
        return changePasswordFor(fallback.id, input);
      }
      if (id !== user.id && !isSelf(actor.identity, user)) {
        throw new ForbiddenError("You can only change your own password");
      }
      return changePasswordFor(user.id, input);
    },

    async resetPasswordStub(): Promise<void> {
      // Spec: admin reset endpoint returns empty success without performing reset.
      return;
    },

    async updatePreferences(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: UpdatePreferencesInput
    ): Promise<User> {
      const actor = requireOrgIdentity(identity);
      const user = await repository.findById(id);
      if (!user) {
        throw new NotFoundError("User not found");
      }
      if (!isSelf(actor.identity, user)) {
        await assertAllowed(actor.identity, "read", id);
      }
      const updated = await repository.updatePreferences(id, input);
      if (!updated) {
        throw new NotFoundError("User not found");
      }
      return updated;
    },

    async updateSystemAccess(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: UpdateSystemAccessInput
    ): Promise<User> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "create", id);
      await requireOrgMember(actor.organizationId, id);

      const user = await repository.findById(id);
      if (!user) {
        throw new NotFoundError("User not found");
      }

      const expires = computeAccessExpiry(
        user.systemAccess.period,
        input.status
      );
      const updated = await repository.updateSystemAccess(id, {
        status: input.status,
        expires,
      });
      if (!updated) {
        throw new NotFoundError("User not found");
      }

      if (input.status === "Active") {
        await notifications.sendWelcome(updated.email, updated.name);
      } else {
        await notifications.sendAccessRevoked(updated.email, updated.name);
        await sessions.clearSessionsForUser(updated.id);
      }

      return updated;
    },

    async updateProfileImage(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: UpdateProfileImageInput
    ): Promise<User> {
      const actor = requireOrgIdentity(identity);
      const user = await repository.findById(id);
      if (!user) {
        throw new NotFoundError("User not found");
      }
      if (!isSelf(actor.identity, user)) {
        throw new ForbiddenError(
          "Only the profile owner can change the profile photo"
        );
      }
      const updated = await repository.updateProfileImage(id, input);
      if (!updated) {
        throw new NotFoundError("User not found");
      }
      return updated;
    },

    async getProfileImageStub(): Promise<Record<string, never>> {
      // Spec: dedicated profile-image retrieval returns an empty response (stub).
      return {};
    },

    async updateSignature(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: UpdateSignatureInput
    ): Promise<User> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "update", id);
      await requireOrgMember(actor.organizationId, id);
      const updated = await repository.updateSignature(id, input);
      if (!updated) {
        throw new NotFoundError("User not found");
      }
      return updated;
    },

    async addWorkingLocation(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: AddWorkingLocationInput
    ): Promise<User> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "update", id);
      await requireOrgMember(actor.organizationId, id);
      const updated = await repository.addLocation(id, input);
      if (!updated) {
        throw new NotFoundError("User not found");
      }
      return updated;
    },

    async removeWorkingLocation(
      identity: SecurityIdentity | null | undefined,
      id: string,
      locationId: string
    ): Promise<User> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "update", id);
      await requireOrgMember(actor.organizationId, id);
      const updated = await repository.removeLocation(id, locationId);
      if (!updated) {
        throw new NotFoundError("User not found");
      }
      return updated;
    },

    async softDelete(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<void> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "delete", id);

      const user = await repository.findById(id);
      if (!user) {
        throw new NotFoundError("User not found");
      }
      if (isSelf(actor.identity, user)) {
        throw new ForbiddenError("You cannot delete your own account");
      }
      await requireOrgMember(actor.organizationId, id);

      const anonymisedEmail = `(${user.id}) [${user.email}] (Deactivated)`;
      const deleted = await repository.softDelete(id, {
        name: `${user.name} (Deactivated)`,
        firstName: user.firstName,
        lastName: `${user.lastName} (Deactivated)`,
        email: anonymisedEmail,
      });
      if (!deleted) {
        throw new ConflictError("User could not be deleted");
      }
      await sessions.clearSessionsForUser(id);
    },

    async blockExpiredUsers(
      identity: SecurityIdentity | null | undefined,
      userIds: string[]
    ): Promise<{ blocked: number }> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "create");

      let blocked = 0;
      for (const userId of userIds) {
        const membership = await memberships.findByOrganizationAndUser(
          actor.organizationId,
          userId
        );
        if (!membership) continue;
        const user = await repository.findById(userId);
        if (!user || user.systemAccess.status === "Deactivated") continue;

        const updated = await repository.updateSystemAccess(userId, {
          status: "Blocked",
          expires: null,
        });
        if (!updated) continue;
        await notifications.sendAccessRevoked(updated.email, updated.name);
        await sessions.clearSessionsForUser(userId);
        blocked += 1;
      }
      return { blocked };
    },

    async assignComplianceToolkits(
      identity: SecurityIdentity | null | undefined,
      id: string,
      toolkitIds: string[]
    ): Promise<User> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "create", id);
      await requireOrgMember(actor.organizationId, id);

      const user = await repository.findById(id);
      if (!user) {
        throw new NotFoundError("User not found");
      }

      await toolkits.assignToolkits({
        organizationId: actor.organizationId,
        userId: id,
        toolkitIds,
      });
      await sessions.clearSessionsForUser(id);
      return user;
    },

    async resendVerification(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<void> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "read", id);
      await requireOrgMember(actor.organizationId, id);

      const user = await repository.findById(id);
      if (!user) {
        throw new NotFoundError("User not found");
      }
      if (user.emailVerified.status === "verified") {
        throw new ConflictError("Email is already verified");
      }
      await notifications.resendEmailVerification(user.email, user.name);
    },

    async checkOwnership(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<OwnershipCheckResult> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "delete", id);
      await requireOrgMember(actor.organizationId, id);
      const user = await repository.findById(id);
      if (!user) {
        throw new NotFoundError("User not found");
      }
      return ownership.check({
        organizationId: actor.organizationId,
        userId: id,
      });
    },

    async transferOwnership(
      identity: SecurityIdentity | null | undefined,
      id: string,
      destinationUserId: string
    ): Promise<void> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "delete", id);
      await requireOrgMember(actor.organizationId, id);
      await requireOrgMember(actor.organizationId, destinationUserId);

      const source = await repository.findById(id);
      const destination = await repository.findById(destinationUserId);
      if (!source || !destination) {
        throw new NotFoundError("User not found");
      }
      if (id === destinationUserId) {
        throw new ValidationAppError(
          "Destination user must be different from the source user"
        );
      }

      await ownership.transfer({
        organizationId: actor.organizationId,
        sourceUserId: id,
        destinationUserId,
        initiatorUserId: actor.identity.subjectId,
      });
    },
  };
}

export type UsersService = ReturnType<typeof createUsersService>;
