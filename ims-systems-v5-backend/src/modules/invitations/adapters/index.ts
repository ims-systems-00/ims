/**
 * Invitations adapters — backed by the Organisation membership /
 * organisation / user repositories and the shared EmailSystem.
 */

import type { EmailSystem } from "../../../infrastructure/queue";
import { createOrganisationMembershipRepository } from "../../organisation/repositories/organisation-membership.repository";
import { createOrganisationRepository } from "../../organisation/repositories/organisation.repository";
import type { OrganisationRole } from "../../organisation/types";
import { createUserRepository } from "../../users/repositories/user.repository";
import type {
  InvitationEmailPort,
  InvitationMembershipPort,
  InvitationOrganisationPort,
  InvitationUserPort,
} from "../ports";
import { NoOpInvitationEmailAdapter } from "../ports";

export function createInvitationOrganisationAdapter(): InvitationOrganisationPort {
  const organisations = createOrganisationRepository();
  return {
    async findById(id) {
      const organisation = await organisations.findById(id);
      if (!organisation) return null;
      return {
        id: organisation.id,
        name: organisation.name,
        licences: organisation.licences,
      };
    },
  };
}

export function createInvitationMembershipAdapter(): InvitationMembershipPort {
  const memberships = createOrganisationMembershipRepository();
  return {
    async findByUserAndOrg(userId, organizationId) {
      const membership = await memberships.findByUserAndOrg(
        userId,
        organizationId
      );
      return membership
        ? { userId: membership.userId, role: membership.role }
        : null;
    },
    async listByOrganization(organizationId) {
      const rows = await memberships.listByOrganization(organizationId);
      return rows.map((row) => ({ userId: row.userId, role: row.role }));
    },
    async create(input) {
      const membership = await memberships.create({
        organizationId: input.organizationId,
        userId: input.userId,
        role: input.role as OrganisationRole,
        createdOn: new Date(),
      });
      return { userId: membership.userId, role: membership.role };
    },
  };
}

export function createInvitationUserAdapter(): InvitationUserPort {
  const repository = createUserRepository();
  return {
    async findByEmail(email) {
      const user = await repository.findByEmail(email);
      return user ? { id: user.id, email: user.email, name: user.name } : null;
    },
    async findById(id) {
      const user = await repository.findById(id);
      return user ? { id: user.id, email: user.email, name: user.name } : null;
    },
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function createInvitationEmailAdapter(
  email: EmailSystem | undefined
): InvitationEmailPort {
  if (!email) return new NoOpInvitationEmailAdapter();
  return {
    async sendInvitation(input) {
      const inviter = escapeHtml(input.inviterName);
      const organisation = escapeHtml(input.organisationName);
      const role = escapeHtml(input.role);
      await email.sendTransactional({
        to: input.to,
        subject: "iMS Invitation",
        html: `
          <p>${inviter} has invited you to join <strong>${organisation}</strong> as a ${role} on iMS Systems.</p>
          <p><a href="${input.acceptUrl}">Accept your invitation</a></p>
          <p>This link expires on ${input.expiresAt.toUTCString()}. If you do not yet have an iMS account, register with this email address first, then open the link again.</p>
        `.trim(),
        text: `${input.inviterName} has invited you to join ${input.organisationName} as a ${input.role} on iMS Systems. Accept your invitation: ${input.acceptUrl} (expires ${input.expiresAt.toUTCString()}).`,
        category: "transactional",
      });
    },
  };
}
