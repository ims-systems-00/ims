import {
  ConflictError,
  NotFoundError,
} from "../../../shared";
import type { MembershipLookupPort, UserNotificationPort } from "../ports";
import type { UserRepository } from "../repositories/user.repository";
import type { UnitMembershipRepository } from "../repositories/unit-membership.repository";
import {
  toUnitMemberView,
  type FunctionalUnitUsersPort,
  type UnitMemberView,
} from "../functional-unit-users.port";

export type CreateFunctionalUnitUsersAdapterDeps = {
  users: UserRepository;
  unitMemberships: UnitMembershipRepository;
  memberships: MembershipLookupPort;
  notifications?: UserNotificationPort;
  /** Resolves unit display name for notification emails. */
  resolveUnitName?: (
    organizationId: string,
    functionalUnitId: string
  ) => Promise<string | null>;
};

/**
 * Public Users adapter for Functional Units member management.
 * Keeps association persistence inside the Users module.
 */
export function createFunctionalUnitUsersAdapter(
  deps: CreateFunctionalUnitUsersAdapterDeps
): FunctionalUnitUsersPort {
  const {
    users,
    unitMemberships,
    memberships,
    notifications,
    resolveUnitName,
  } = deps;

  async function requireActiveOrgUser(
    organizationId: string,
    userId: string
  ): Promise<{ user: NonNullable<Awaited<ReturnType<UserRepository["findById"]>>>; membership: NonNullable<Awaited<ReturnType<MembershipLookupPort["findByOrganizationAndUser"]>>> }> {
    const user = await users.findById(userId);
    if (!user || user.systemAccess.status !== "Active" || user.deletedAt) {
      throw new NotFoundError("User not found");
    }
    const membership = await memberships.findByOrganizationAndUser(
      organizationId,
      userId
    );
    if (!membership) {
      throw new NotFoundError("User not found in organisation");
    }
    return { user, membership };
  }

  return {
    async listMembers(organizationId, functionalUnitId) {
      const memberIds = await unitMemberships.listUserIdsForUnit(
        organizationId,
        functionalUnitId
      );
      const views: UnitMemberView[] = [];
      for (const userId of memberIds) {
        const user = await users.findById(userId);
        if (!user || user.deletedAt || user.systemAccess.status !== "Active") {
          continue;
        }
        const membership = await memberships.findByOrganizationAndUser(
          organizationId,
          userId
        );
        views.push(toUnitMemberView(user, membership));
      }
      views.sort((a, b) => a.name.localeCompare(b.name));
      return views;
    },

    async listEligible(organizationId, functionalUnitId, search) {
      const orgMembers = await memberships.listByOrganization(organizationId);
      const existing = new Set(
        await unitMemberships.listUserIdsForUnit(
          organizationId,
          functionalUnitId
        )
      );
      const needle = search?.trim().toLowerCase() ?? "";
      const views: UnitMemberView[] = [];

      for (const membership of orgMembers) {
        if (existing.has(membership.userId)) continue;
        const user = await users.findById(membership.userId);
        if (!user || user.deletedAt || user.systemAccess.status !== "Active") {
          continue;
        }
        if (needle) {
          const haystack = [
            user.name,
            user.email,
            membership.jobTitle ?? "",
            membership.role,
          ]
            .join(" ")
            .toLowerCase();
          if (!haystack.includes(needle)) continue;
        }
        views.push(toUnitMemberView(user, membership));
      }

      views.sort((a, b) => a.name.localeCompare(b.name));
      return views;
    },

    async addMember(organizationId, functionalUnitId, userId) {
      const { user, membership } = await requireActiveOrgUser(
        organizationId,
        userId
      );
      const result = await unitMemberships.add(
        organizationId,
        functionalUnitId,
        userId
      );
      if (result === "exists") {
        throw new ConflictError("User already added to this group");
      }
      if (notifications) {
        const unitName =
          (await resolveUnitName?.(organizationId, functionalUnitId)) ??
          "functional unit";
        await notifications.sendWelcome(
          user.email,
          `${user.name} (${unitName})`
        );
      }
      return toUnitMemberView(user, membership);
    },

    async removeMember(organizationId, functionalUnitId, userId) {
      const removed = await unitMemberships.remove(
        organizationId,
        functionalUnitId,
        userId
      );
      if (removed && notifications) {
        const user = await users.findById(userId);
        if (user) {
          const unitName =
            (await resolveUnitName?.(organizationId, functionalUnitId)) ??
            "functional unit";
          await notifications.sendAccessRevoked(
            user.email,
            `${user.name} (${unitName})`
          );
        }
      }
      return removed;
    },

    async countMembers(organizationId, functionalUnitId) {
      return unitMemberships.countForUnit(organizationId, functionalUnitId);
    },
  };
}
