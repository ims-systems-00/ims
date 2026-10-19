/**
 * Projects OrganisationMembership roles into OpenFGA tuples (D-21 write path).
 */

import type { OrganisationRole } from "../../modules/organisation/types";
import {
  OPENFGA_ORG_ROLE_RELATIONS,
  organisationRoleToRelation,
  organizationObject,
  userObject,
} from "./role-mapping";
import type { OpenFgaGateway } from "./types";

export type MembershipProjection = {
  onMembershipCreated(input: {
    userId: string;
    organizationId: string;
    role: OrganisationRole;
  }): Promise<void>;
  onMembershipRoleChanged(input: {
    userId: string;
    organizationId: string;
    previousRole: OrganisationRole;
    nextRole: OrganisationRole;
  }): Promise<void>;
  onMembershipRemoved(input: {
    userId: string;
    organizationId: string;
    role: OrganisationRole;
  }): Promise<void>;
};

export function createMembershipProjection(
  gateway: OpenFgaGateway
): MembershipProjection {
  return {
    async onMembershipCreated(input) {
      const relation = organisationRoleToRelation(input.role);
      await gateway.writeTuples([
        {
          user: userObject(input.userId),
          relation,
          object: organizationObject(input.organizationId),
        },
      ]);
    },

    async onMembershipRoleChanged(input) {
      if (input.previousRole === input.nextRole) return;
      const previous = organisationRoleToRelation(input.previousRole);
      const next = organisationRoleToRelation(input.nextRole);
      await gateway.deleteTuples([
        {
          user: userObject(input.userId),
          relation: previous,
          object: organizationObject(input.organizationId),
        },
      ]);
      await gateway.writeTuples([
        {
          user: userObject(input.userId),
          relation: next,
          object: organizationObject(input.organizationId),
        },
      ]);
    },

    async onMembershipRemoved(input) {
      const relation = organisationRoleToRelation(input.role);
      // Delete known role; also attempt all role relations for safety.
      const deletes = OPENFGA_ORG_ROLE_RELATIONS.map((rel) => ({
        user: userObject(input.userId),
        relation: rel,
        object: organizationObject(input.organizationId),
      }));
      // Prefer precise delete first; fall back set includes all.
      try {
        await gateway.deleteTuples([
          {
            user: userObject(input.userId),
            relation,
            object: organizationObject(input.organizationId),
          },
        ]);
      } catch {
        await gateway.deleteTuples(deletes);
      }
    },
  };
}

/** No-op projection for stub / tests without OpenFGA. */
export function createNoOpMembershipProjection(): MembershipProjection {
  return {
    async onMembershipCreated() {},
    async onMembershipRoleChanged() {},
    async onMembershipRemoved() {},
  };
}
