/**
 * Invitations frontend types — mirrors the backend module
 * (ims-systems-v5-backend/src/modules/invitations).
 * Invite dropdown matches V4 ROLES minus the unused `Auditor` label.
 */

export const INVITATION_ROLES = [
  "Super Admin",
  "Head of Service",
  "Basic User",
  "Internal Auditor",
  "External Auditor",
  "External User",
] as const;

export type InvitationRole = (typeof INVITATION_ROLES)[number];

export type InvitationStatus = "Pending" | "Expired";

export type Invitation = {
  id: string;
  organizationId: string;
  email: string;
  role: InvitationRole;
  createdBy: string;
  inviterName: string;
  organisationName: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  status: InvitationStatus;
  /** True when a user account already exists for the invited email. */
  hasAccount: boolean;
};

export type PaginatedInvitations = {
  items: Invitation[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type ListInvitationsParams = {
  page?: number;
  pageSize?: number;
  search?: string;
};

export type CreateInvitationInput = {
  email: string;
  role: InvitationRole;
};

/** Public preview behind the emailed acceptance link. */
export type InvitationPreview = {
  email: string;
  role: InvitationRole;
  organizationId: string;
  organisationName: string;
  inviterName: string;
  expiresAt: string;
  hasAccount: boolean;
};

export type AcceptInvitationResult = {
  organizationId: string;
  organisationName: string;
  role: InvitationRole;
  userId: string;
};
