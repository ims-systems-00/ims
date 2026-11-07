/**
 * Cross-module ports for Invitations. Real adapters (in `adapters/`)
 * are backed by the Organisation / Membership / Users repositories and
 * the shared EmailSystem; tests can substitute fakes.
 */

import type { OrganisationLicences, OrganisationRole } from "../organisation/types";

export type InvitationOrganisation = {
  id: string;
  name: string;
  licences: OrganisationLicences;
};

export interface InvitationOrganisationPort {
  findById(id: string): Promise<InvitationOrganisation | null>;
}

export type InvitationMembershipView = {
  userId: string;
  role: OrganisationRole;
};

export interface InvitationMembershipPort {
  findByUserAndOrg(
    userId: string,
    organizationId: string
  ): Promise<InvitationMembershipView | null>;
  listByOrganization(
    organizationId: string
  ): Promise<InvitationMembershipView[]>;
  create(input: {
    organizationId: string;
    userId: string;
    role: OrganisationRole;
  }): Promise<InvitationMembershipView>;
}

export type InvitationUserView = {
  id: string;
  email: string;
  name: string;
};

export interface InvitationUserPort {
  findByEmail(email: string): Promise<InvitationUserView | null>;
  findById(id: string): Promise<InvitationUserView | null>;
}

export interface InvitationEmailPort {
  sendInvitation(input: {
    to: string;
    inviterName: string;
    organisationName: string;
    role: OrganisationRole;
    acceptUrl: string;
    expiresAt: Date;
    organizationId?: string;
  }): Promise<void>;
}

/** Development adapter — no email transport configured. */
export class NoOpInvitationEmailAdapter implements InvitationEmailPort {
  async sendInvitation(): Promise<void> {
    return;
  }
}
