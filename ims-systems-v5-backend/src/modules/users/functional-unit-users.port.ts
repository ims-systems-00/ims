/**
 * Public Users capabilities consumed by Functional Units for member management.
 * Implemented by the Users module; Functional Units must not touch Users models.
 */

import type { UserPublic } from "./types";

export type UnitMemberView = {
  id: string;
  reference: string;
  name: string;
  email: string;
  jobTitle: string | null;
  role: string | null;
  systemAccessStatus: string;
  profileImageUrl: string;
  lastLoggedIn: string | null;
};

export interface FunctionalUnitUsersPort {
  listMembers(
    organizationId: string,
    functionalUnitId: string
  ): Promise<UnitMemberView[]>;

  listEligible(
    organizationId: string,
    functionalUnitId: string,
    search?: string
  ): Promise<UnitMemberView[]>;

  /**
   * Adds an Active organisation user to the unit.
   * @throws ConflictError when already a member
   * @throws NotFoundError when user missing / inactive / not in organisation
   */
  addMember(
    organizationId: string,
    functionalUnitId: string,
    userId: string
  ): Promise<UnitMemberView>;

  /**
   * Removes unit membership only — never deletes the User entity.
   * @returns false when the user was not a member
   */
  removeMember(
    organizationId: string,
    functionalUnitId: string,
    userId: string
  ): Promise<boolean>;

  countMembers(
    organizationId: string,
    functionalUnitId: string
  ): Promise<number>;
}

export function toUnitMemberView(
  user: UserPublic,
  membership?: { role?: string | null; jobTitle?: string | null } | null
): UnitMemberView {
  return {
    id: user.id,
    reference: user.reference,
    name: user.name,
    email: user.email,
    jobTitle: membership?.jobTitle ?? null,
    role: membership?.role ?? null,
    systemAccessStatus: user.systemAccess.status,
    profileImageUrl: user.profileImage.url,
    lastLoggedIn: user.loggedIn.on
      ? user.loggedIn.on.toISOString()
      : null,
  };
}
