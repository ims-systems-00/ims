/**
 * Partnership service — apply + auto-accept (V4 parity), dashboard.
 *
 * Apply: record saved Pending → immediately accepted (organisation
 * isPartner = true) → emails to the applicant (received + accepted with
 * partner code and signup link). Duplicate enrolment blocked per organisation
 * (same user may partner separately for another org).
 */

import {
  renderEmailForOrganisation,
  type EmailBranding,
} from "../../../infrastructure/email/templates";
import type { Logger } from "../../../infrastructure/logging/logger";
import type { EmailSystem } from "../../../infrastructure/queue";
import type { SecurityIdentity } from "../../../security";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../../../shared";
import type {
  PartnershipMembershipPort,
  PartnershipOrganisationPort,
} from "../ports";
import type { PartnershipRepository } from "../repositories/partnership.repository";
import type {
  ApplyPartnershipInput,
  Partnership,
  PartnershipDashboard,
} from "../types";

export type PartnershipService = ReturnType<typeof createPartnershipService>;

export type PartnershipServiceDeps = {
  repository: PartnershipRepository;
  organisations: PartnershipOrganisationPort;
  memberships: PartnershipMembershipPort;
  email?: EmailSystem;
  clientUrl: string;
  logger?: Logger;
  resolveEmailBranding?: (organizationId: string) => Promise<EmailBranding>;
};

export function createPartnershipService(deps: PartnershipServiceDeps) {
  const { repository, organisations, memberships, email, logger } = deps;
  const clientUrl = deps.clientUrl.replace(/\/$/, "");

  function signupUrl(partnerCode: string): string {
    return `${clientUrl}/onboard/organisation?partnerCode=${partnerCode}`;
  }

  function requireIdentity(
    identity: SecurityIdentity | null | undefined
  ): SecurityIdentity & { subjectId: string } {
    if (!identity?.subjectId) {
      throw new ForbiddenError("Authentication required");
    }
    return identity as SecurityIdentity & { subjectId: string };
  }

  async function sendSafe(input: {
    to: string;
    subject: string;
    html: string;
    text: string;
    organizationId: string;
    label: string;
  }): Promise<void> {
    if (!email) return;
    try {
      await email.sendTransactional({
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        category: "customer-communication",
        organizationId: input.organizationId,
      });
    } catch (error) {
      logger?.warn(
        {
          organizationId: input.organizationId,
          label: input.label,
          err: error instanceof Error ? error.message : String(error),
        },
        "Partnership email failed"
      );
    }
  }

  async function sendApplicantEmails(
    partnership: Partnership,
    actorEmail: string | undefined,
    orgName: string
  ): Promise<void> {
    if (!actorEmail) {
      logger?.warn(
        { organizationId: partnership.organizationId },
        "Partnership emails skipped: no actor email on identity"
      );
      return;
    }
    const brandOpts = {
      organizationId: partnership.organizationId,
      resolveBranding: deps.resolveEmailBranding,
    };
    const received = await renderEmailForOrganisation(
      "partnership-application-received",
      { organisationName: orgName },
      brandOpts
    );
    await sendSafe({
      to: actorEmail,
      subject: received.subject,
      html: received.html,
      text: received.text,
      organizationId: partnership.organizationId,
      label: "partnership-received",
    });
    const link = signupUrl(partnership.id);
    const codeReady = await renderEmailForOrganisation(
      "partnership-code-ready",
      {
        organisationName: orgName,
        partnerCode: partnership.id,
        htmlExtra: `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;">Share your code or link — organisations that sign up with it will appear on your partner dashboard.</p><p style="margin:0 0 14px;font-size:14px;"><a href="${link}">${link}</a></p>`,
      },
      brandOpts
    );
    await sendSafe({
      to: actorEmail,
      subject: codeReady.subject,
      html: codeReady.html,
      text: `${codeReady.text}\nSignup link: ${link}`,
      organizationId: partnership.organizationId,
      label: "partnership-accepted",
    });
  }

  return {
    async apply(
      identity: SecurityIdentity | null | undefined,
      input: ApplyPartnershipInput
    ): Promise<Partnership> {
      const actor = requireIdentity(identity);
      if (!actor.organizationId) {
        throw new ForbiddenError(
          "Can not apply for a partnership program without an organisation id."
        );
      }

      const isMember = await memberships.isMember(
        actor.subjectId,
        actor.organizationId
      );
      if (!isMember) {
        throw new ForbiddenError(
          "You are not a member of this organisation."
        );
      }

      // Partnership is per organisation: a user may partner for org A and
      // later apply separately for referred org B. Do not block on userId.
      const existing = await repository.findByOrganizationId(
        actor.organizationId
      );
      if (existing) {
        throw new ConflictError(
          "This organisation is already enrolled in a partnership programme."
        );
      }

      const organisation = await organisations.findById(actor.organizationId);
      if (!organisation) {
        throw new NotFoundError("Organisation not found");
      }

      const pending = await repository.create({
        userId: actor.subjectId,
        organizationId: actor.organizationId,
        data: input,
      });

      // Auto-accept (V4): flag org as partner, mark record accepted.
      await organisations.markAsPartner(actor.organizationId);
      const accepted =
        (await repository.markAccepted(pending.id)) ?? pending;

      await sendApplicantEmails(accepted, actor.email, organisation.name);

      return accepted;
    },

    async listMine(
      identity: SecurityIdentity | null | undefined
    ): Promise<Partnership[]> {
      const actor = requireIdentity(identity);
      return repository.listByUser(actor.subjectId);
    },

    async getById(id: string): Promise<{
      partnership: Partnership;
      organisationName: string | null;
    }> {
      const partnership = await repository.findById(id);
      if (!partnership) {
        throw new NotFoundError("Partnership not found");
      }
      const organisation = await organisations.findById(
        partnership.organizationId
      );
      return {
        partnership,
        organisationName: organisation?.name ?? null,
      };
    },

    async dashboard(
      identity: SecurityIdentity | null | undefined
    ): Promise<PartnershipDashboard> {
      const actor = requireIdentity(identity);
      if (!actor.organizationId) {
        throw new ForbiddenError(
          "Organisation context is required for the partner dashboard."
        );
      }
      // Dashboard is org-scoped: the active org's partnership only — not
      // another org the same user may partner for.
      const partnership = await repository.findAcceptedByOrganization(
        actor.organizationId
      );
      if (!partnership) {
        throw new NotFoundError(
          "No accepted partnership found for this organisation"
        );
      }

      const referred = await organisations.listByReferralSource(partnership.id);

      const stats = {
        organisations: referred.length,
        groups: 0,
        users: 0,
        superUsers: 0,
        crmModules: 0,
      };
      const toolkitCounts = new Map<string, number>();
      for (const org of referred) {
        stats.groups += org.licences.groups.allocated;
        stats.users += org.licences.users.allocated;
        stats.superUsers += org.licences.superUser.allocated;
        if (org.licences.additionalModules.includes("CRM")) {
          stats.crmModules += 1;
        }
        for (const tool of org.licences.complianceTools) {
          toolkitCounts.set(tool, (toolkitCounts.get(tool) ?? 0) + 1);
        }
      }

      return {
        partnership,
        partnerCode: partnership.id,
        signupUrl: signupUrl(partnership.id),
        stats,
        complianceBreakdown: [...toolkitCounts.entries()]
          .map(([toolkit, count]) => ({ toolkit, count }))
          .sort((a, b) => b.count - a.count),
        organisations: referred.map((org) => ({
          id: org.id,
          name: org.name,
          createdAt: org.createdAt,
          isCustomer: org.isCustomer,
          superUser: org.licences.superUser,
          users: org.licences.users,
          groups: org.licences.groups,
          complianceTools: org.licences.complianceTools,
          additionalModules: org.licences.additionalModules,
        })),
      };
    },
  };
}
