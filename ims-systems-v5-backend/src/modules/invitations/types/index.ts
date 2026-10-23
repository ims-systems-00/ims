/**
 * Invitations module domain types.
 * Spec: docs/module-specifications/invitations.md (adapted to V5 roles).
 *
 * An invitation is a pending offer for an email address to join one
 * organisation with one organisation role. Only the SHA-256 hash of the
 * acceptance token is ever persisted; the raw token exists solely in
 * the emailed link.
 */

import type { OrganisationRole } from "../../organisation/types";

export { ORGANISATION_ROLES } from "../../organisation/types";
export type { OrganisationRole };

/** Computed from `expiresAt` — no status column is stored. */
export type InvitationStatus = "Pending" | "Expired";

export type Invitation = {
  id: string;
  organizationId: string;
  email: string;
  role: OrganisationRole;
  /** User id of the inviter. */
  createdBy: string;
  /** Display name of the inviter, snapshotted for the recipient email/preview. */
  inviterName: string;
  /** Organisation display name, snapshotted for the recipient email/preview. */
  organisationName: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type InvitationView = Invitation & {
  status: InvitationStatus;
  /** True when a user account already exists for the invited email. */
  hasAccount: boolean;
};

export type CreateInvitationInput = {
  email: string;
  role: OrganisationRole;
};

export type ListInvitationsQuery = {
  page: number;
  pageSize: number;
  search?: string;
};

export type PaginatedInvitations = {
  items: InvitationView[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

/** Public, unauthenticated preview behind the emailed acceptance link. */
export type InvitationPreview = {
  email: string;
  role: OrganisationRole;
  organizationId: string;
  organisationName: string;
  inviterName: string;
  expiresAt: Date;
  hasAccount: boolean;
};

export type AcceptInvitationResult = {
  organizationId: string;
  organisationName: string;
  role: OrganisationRole;
  userId: string;
};

/**
 * Authorisation is checked against the `users` resource with standard
 * actions (create/read/update/delete): it is the resource OpenFGA
 * enforces (spec: backend gates invitation management on Users), so a
 * bespoke `invitations` resource would fail closed under auth0-openfga.
 */
export const INVITATIONS_RESOURCE = "users";

/** Acceptance-token lifetime (spec: 72 hours). */
export const INVITATION_TOKEN_TTL_MS = 72 * 60 * 60 * 1_000;
