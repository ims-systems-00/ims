/**
 * Invitations adapters — backed by the Organisation membership /
 * organisation / user repositories and the shared EmailSystem.
 */

import { renderEmail } from "../../../infrastructure/email/templates";
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

export function createInvitationEmailAdapter(
  email: EmailSystem | undefined,
  resolveBranding?: (organizationId: string) => Promise<
    import("../../../infrastructure/email/templates").EmailBranding
  >
): InvitationEmailPort {
  if (!email) return new NoOpInvitationEmailAdapter();
  return {
    async sendInvitation(input) {
      const branding =
        input.organizationId && resolveBranding
          ? await resolveBranding(input.organizationId).catch(() => undefined)
          : undefined;
      const rendered = renderEmail(
        "invitation",
        {
          inviterName: input.inviterName,
          organisationName: input.organisationName,
          role: input.role,
          acceptUrl: input.acceptUrl,
          expiresAt: input.expiresAt,
        },
        branding ? { branding } : undefined
      );
      await email.sendTransactional({
        to: input.to,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        category: "transactional",
        organizationId: input.organizationId,
      });
    },
  };
}
