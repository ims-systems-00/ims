/**
 * Invitations service — spec: docs/module-specifications/invitations.md
 *
 * Send/list/resend/remove are organisation-admin operations (authorised
 * against the `users` resource — see types). Acceptance is token-based:
 * the recipient must be authenticated with an account whose email
 * matches the invitation; accepting creates the organisation membership
 * (and its OpenFGA projection) and consumes the invitation.
 *
 * Licence rule (adapted from spec): a seat category is only enforced
 * when the organisation has a configured allocation (> 0). Taken seats
 * are current members in the category plus pending invitations in it,
 * so parallel invites cannot over-allocate. An allocation of 0 means
 * "not configured" (e.g. dev/demo organisations) and does not block.
 */

import type { Authorizer, SecurityIdentity } from "../../../security";
import type { MembershipProjection } from "../../../security";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationAppError,
} from "../../../shared";
import type {
  InvitationEmailPort,
  InvitationMembershipPort,
  InvitationOrganisationPort,
  InvitationUserPort,
} from "../ports";
import {
  generateInvitationToken,
  type InvitationRepository,
} from "../repositories/invitation.repository";
import {
  INVITATION_TOKEN_TTL_MS,
  INVITATIONS_RESOURCE,
  type AcceptInvitationResult,
  type CreateInvitationInput,
  type Invitation,
  type InvitationPreview,
  type InvitationView,
  type ListInvitationsQuery,
  type OrganisationRole,
  type PaginatedInvitations,
} from "../types";

export type InvitationService = ReturnType<typeof createInvitationService>;

export type InvitationServiceDeps = {
  repository: InvitationRepository;
  authorizer: Authorizer;
  organisations: InvitationOrganisationPort;
  memberships: InvitationMembershipPort;
  users: InvitationUserPort;
  email: InvitationEmailPort;
  /** Projects accepted memberships into OpenFGA (NoOp under the dev stub). */
  membershipProjection?: MembershipProjection;
  /** Base URL for emailed acceptance links, e.g. http://localhost:3000 */
  clientUrl: string;
};

function requireIdentity(
  identity: SecurityIdentity | null | undefined
): SecurityIdentity & { subjectId: string } {
  if (!identity?.subjectId) {
    throw new UnauthorizedError();
  }
  return identity as SecurityIdentity & { subjectId: string };
}

function requireOrgIdentity(
  identity: SecurityIdentity | null | undefined
): { identity: SecurityIdentity & { subjectId: string }; organizationId: string } {
  const authed = requireIdentity(identity);
  if (!authed.organizationId) {
    throw new ForbiddenError("Organisation context is required");
  }
  return { identity: authed, organizationId: authed.organizationId };
}

function isSuperAdminRole(role: OrganisationRole): boolean {
  return role === "Super Admin";
}

export function createInvitationService(deps: InvitationServiceDeps) {
  const {
    repository,
    authorizer,
    organisations,
    memberships,
    users,
    email,
    membershipProjection,
    clientUrl,
  } = deps;
  const baseUrl = clientUrl.replace(/\/$/, "");

  async function assertAllowed(
    identity: SecurityIdentity,
    action: string
  ): Promise<void> {
    const allowed = await authorizer.allow({
      identity,
      action,
      resourceType: INVITATIONS_RESOURCE,
      organizationId: identity.organizationId,
    });
    if (!allowed) {
      throw new ForbiddenError(
        "User does not have permission to manage invitations"
      );
    }
  }

  function acceptUrl(rawToken: string, hasAccount: boolean): string {
    return `${baseUrl}/auth/onboard/accept-invitation/${rawToken}?hasAccount=${hasAccount ? "true" : "false"}`;
  }

  function toView(
    invitation: Invitation,
    hasAccount: boolean
  ): InvitationView {
    return {
      ...invitation,
      status: invitation.expiresAt.getTime() > Date.now() ? "Pending" : "Expired",
      hasAccount,
    };
  }

  async function assertLicenceAvailable(
    organizationId: string,
    role: OrganisationRole
  ): Promise<void> {
    const organisation = await organisations.findById(organizationId);
    if (!organisation) {
      throw new NotFoundError("Organisation not found");
    }
    const counter = isSuperAdminRole(role)
      ? organisation.licences.superUser
      : organisation.licences.users;
    if (counter.allocated <= 0) return; // Not configured — do not block.

    const members = await memberships.listByOrganization(organizationId);
    const memberSeats = members.filter(
      (member) => isSuperAdminRole(member.role) === isSuperAdminRole(role)
    ).length;
    const pendingSeats = (
      await repository.listAllByOrganization(organizationId)
    ).filter(
      (invitation) =>
        invitation.expiresAt.getTime() > Date.now() &&
        isSuperAdminRole(invitation.role) === isSuperAdminRole(role)
    ).length;

    if (memberSeats + pendingSeats >= counter.allocated) {
      throw new ConflictError(
        "No available licences for this role. Request more licences via licence management."
      );
    }
  }

  async function sendInvitationEmail(
    invitation: Invitation,
    rawToken: string
  ): Promise<void> {
    const existingUser = await users.findByEmail(invitation.email);
    await email.sendInvitation({
      to: invitation.email,
      inviterName: invitation.inviterName || "An administrator",
      organisationName: invitation.organisationName || "an organisation",
      role: invitation.role,
      acceptUrl: acceptUrl(rawToken, Boolean(existingUser)),
      expiresAt: invitation.expiresAt,
    });
  }

  async function requireOrgInvitation(
    organizationId: string,
    id: string
  ): Promise<Invitation> {
    const invitation = await repository.findById(id);
    if (!invitation || invitation.organizationId !== organizationId) {
      throw new NotFoundError("Invitation not found");
    }
    return invitation;
  }

  return {
    async create(
      identity: SecurityIdentity | null | undefined,
      input: CreateInvitationInput
    ): Promise<InvitationView> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "create");

      const emailAddress = input.email.trim().toLowerCase();

      const organisation = await organisations.findById(actor.organizationId);
      if (!organisation) {
        throw new NotFoundError("Organisation not found");
      }

      const duplicate = await repository.findByOrgAndEmail(
        actor.organizationId,
        emailAddress
      );
      if (duplicate) {
        throw new ConflictError("User is already invited.");
      }

      const existingUser = await users.findByEmail(emailAddress);
      if (existingUser) {
        const membership = await memberships.findByUserAndOrg(
          existingUser.id,
          actor.organizationId
        );
        if (membership) {
          throw new ConflictError("User already is a member of organisation.");
        }
      }

      await assertLicenceAvailable(actor.organizationId, input.role);

      const rawToken = generateInvitationToken();
      const inviter = await users.findById(actor.identity.subjectId);
      const invitation = await repository.create({
        organizationId: actor.organizationId,
        email: emailAddress,
        role: input.role,
        createdBy: actor.identity.subjectId,
        inviterName:
          inviter?.name ?? actor.identity.email ?? "An administrator",
        organisationName: organisation.name,
        rawToken,
        expiresAt: new Date(Date.now() + INVITATION_TOKEN_TTL_MS),
      });

      await sendInvitationEmail(invitation, rawToken);
      return toView(invitation, Boolean(existingUser));
    },

    async list(
      identity: SecurityIdentity | null | undefined,
      query: ListInvitationsQuery
    ): Promise<PaginatedInvitations> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "read");

      const { items, total } = await repository.listByOrganization(
        actor.organizationId,
        query
      );
      const views = await Promise.all(
        items.map(async (invitation) =>
          toView(invitation, Boolean(await users.findByEmail(invitation.email)))
        )
      );
      return {
        items: views,
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
      };
    },

    /** Invitations addressed to the signed-in user's email (no org context needed). */
    async listReceived(
      identity: SecurityIdentity | null | undefined
    ): Promise<InvitationView[]> {
      const actor = requireIdentity(identity);
      const emailAddress =
        actor.email?.toLowerCase() ??
        (await users.findById(actor.subjectId))?.email?.toLowerCase();
      if (!emailAddress) return [];
      const invitations = await repository.listByEmail(emailAddress);
      return invitations
        .filter((invitation) => invitation.expiresAt.getTime() > Date.now())
        .map((invitation) => toView(invitation, true));
    },

    async getById(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<InvitationView> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "read");
      const invitation = await requireOrgInvitation(actor.organizationId, id);
      return toView(
        invitation,
        Boolean(await users.findByEmail(invitation.email))
      );
    },

    async resend(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<InvitationView> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "update");
      const existing = await requireOrgInvitation(actor.organizationId, id);

      const rawToken = generateInvitationToken();
      const updated = await repository.rotateToken(
        existing.id,
        rawToken,
        new Date(Date.now() + INVITATION_TOKEN_TTL_MS)
      );
      if (!updated) {
        throw new NotFoundError("Invitation not found");
      }
      await sendInvitationEmail(updated, rawToken);
      return toView(
        updated,
        Boolean(await users.findByEmail(updated.email))
      );
    },

    async remove(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<{ id: string; deleted: true }> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "delete");
      const existing = await requireOrgInvitation(actor.organizationId, id);
      await repository.remove(existing.id);
      return { id: existing.id, deleted: true };
    },

    /** Public preview for the emailed link — no authentication required. */
    async preview(rawToken: string): Promise<InvitationPreview> {
      const invitation = await repository.findByRawToken(rawToken);
      if (!invitation) {
        throw new NotFoundError("Invitation not found");
      }
      if (invitation.expiresAt.getTime() <= Date.now()) {
        throw new ValidationAppError("Token expired.");
      }
      const existingUser = await users.findByEmail(invitation.email);
      return {
        email: invitation.email,
        role: invitation.role,
        organizationId: invitation.organizationId,
        organisationName: invitation.organisationName,
        inviterName: invitation.inviterName,
        expiresAt: invitation.expiresAt,
        hasAccount: Boolean(existingUser),
      };
    },

    async accept(
      identity: SecurityIdentity | null | undefined,
      rawToken: string
    ): Promise<AcceptInvitationResult> {
      const actor = requireIdentity(identity);

      const invitation = await repository.findByRawToken(rawToken);
      if (!invitation) {
        throw new NotFoundError("Invitation not found");
      }
      if (invitation.expiresAt.getTime() <= Date.now()) {
        throw new ValidationAppError("Token expired.");
      }

      const actorEmail =
        actor.email?.toLowerCase() ??
        (await users.findById(actor.subjectId))?.email?.toLowerCase();
      if (!actorEmail || actorEmail !== invitation.email.toLowerCase()) {
        throw new ForbiddenError(
          "Invitation email does not match the signed-in account"
        );
      }

      const user = await users.findByEmail(invitation.email);
      if (!user) {
        throw new NotFoundError(
          "No user account exists for this email. Register first, then open the invitation link again."
        );
      }

      const existingMembership = await memberships.findByUserAndOrg(
        user.id,
        invitation.organizationId
      );
      if (existingMembership) {
        await repository.remove(invitation.id);
        throw new ConflictError("User already is a member of organisation.");
      }

      await assertLicenceAvailable(
        invitation.organizationId,
        invitation.role
      );

      const membership = await memberships.create({
        organizationId: invitation.organizationId,
        userId: user.id,
        role: invitation.role,
      });
      if (membershipProjection) {
        await membershipProjection.onMembershipCreated({
          userId: user.id,
          organizationId: invitation.organizationId,
          role: invitation.role,
        });
      }
      await repository.remove(invitation.id);

      return {
        organizationId: invitation.organizationId,
        organisationName: invitation.organisationName,
        role: membership.role,
        userId: user.id,
      };
    },
  };
}
