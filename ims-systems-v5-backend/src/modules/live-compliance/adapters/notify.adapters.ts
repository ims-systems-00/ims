/**
 * Phase 2 adapters: recipients (memberships + users), in-app notifications
 * (Notifications application port) and email (org-branded templates).
 * Same precedent as invitations/adapters: read sibling repositories directly
 * because these run outside an HTTP request (scheduler / events).
 */

import { createHash } from "node:crypto";
import { renderEmailForOrganisation } from "../../../infrastructure/email/templates";
import type { EmailBranding } from "../../../infrastructure/email/templates";
import type { EmailSystem } from "../../../infrastructure/queue";
import type { NotificationsApplicationPort } from "../../notifications";
import { createOrganisationMembershipRepository } from "../../organisation/repositories/organisation-membership.repository";
import { createOrganisationRepository } from "../../organisation/repositories/organisation.repository";
import { createUserRepository } from "../../users/repositories/user.repository";
import type {
  LiveComplianceContact,
  LiveComplianceEmailPort,
  LiveComplianceNotificationsPort,
  LiveComplianceRecipientsPort,
} from "../ports";

/** Roles that receive clause alerts when a clause has no RACI owner. */
export const FALLBACK_RECIPIENT_ROLES = ["Super Admin", "Head of Service"] as const;

export function createLiveComplianceRecipientsAdapter(): LiveComplianceRecipientsPort {
  const memberships = createOrganisationMembershipRepository();
  const users = createUserRepository();
  const organisations = createOrganisationRepository();

  async function toContacts(userIds: string[]): Promise<LiveComplianceContact[]> {
    if (!userIds.length) return [];
    const { items } = await users.listActiveByIds(userIds, {
      page: 1,
      pageSize: Math.max(userIds.length, 1),
    });
    return items.map((user) => ({
      userId: user.id,
      name: user.name?.trim() || user.email,
      email: user.email ?? null,
    }));
  }

  return {
    async contacts(organizationId, userIds) {
      const wanted = new Set(userIds);
      const active = (await memberships.listByOrganization(organizationId))
        .filter((m) => m.accessStatus !== "Blocked" && wanted.has(m.userId))
        .map((m) => m.userId);
      return toContacts(active);
    },
    async admins(organizationId) {
      const roles = new Set<string>(FALLBACK_RECIPIENT_ROLES);
      const ids = (await memberships.listByOrganization(organizationId))
        .filter((m) => m.accessStatus !== "Blocked" && roles.has(m.role))
        .map((m) => m.userId);
      return toContacts(ids);
    },
    async organisationName(organizationId) {
      return (await organisations.findById(organizationId))?.name ?? null;
    },
  };
}

/** Admins see unowned action-centre items. */
export function createLiveCompliancePeopleAdapter(): {
  isAdmin(organizationId: string, userId: string): Promise<boolean>;
} {
  const memberships = createOrganisationMembershipRepository();
  const roles = new Set<string>(FALLBACK_RECIPIENT_ROLES);
  return {
    async isAdmin(organizationId, userId) {
      const membership = await memberships.findByUserAndOrg(userId, organizationId);
      return Boolean(
        membership && membership.accessStatus !== "Blocked" && roles.has(membership.role)
      );
    },
  };
}

export function createLiveComplianceNotificationsAdapter(
  notifications: NotificationsApplicationPort
): LiveComplianceNotificationsPort {
  return {
    async createForRecipients({ organizationId, items }) {
      if (!items.length) return;
      await notifications.createForRecipients({
        organizationId,
        createdBy: "system",
        recipients: items.map((item) => ({
          recipientUserId: item.recipientUserId,
          title: item.title,
          message: item.message,
          referenceType: "compliance",
          referenceModuleId: item.clause,
          screenIdentifier: "live-compliance",
          // Frontend resolves params.id (a live module) to the module page.
          params: { id: item.module },
          channels: item.channels,
        })),
      });
    },
  };
}

/** Email job dedupe keys are capped at 128 chars. */
function boundedKey(key: string): string {
  if (key.length <= 128) return key;
  return `lc:${createHash("sha256").update(key).digest("hex")}`;
}

export function createLiveComplianceEmailAdapter(input: {
  email: EmailSystem;
  resolveBranding?: (organizationId: string) => Promise<EmailBranding>;
}): LiveComplianceEmailPort {
  return {
    async sendAlert({ organizationId, to, dedupeKey, data }) {
      const rendered = await renderEmailForOrganisation("compliance-alert", data, {
        organizationId,
        ...(input.resolveBranding ? { resolveBranding: input.resolveBranding } : {}),
      });
      await input.email.sendTransactional({
        to,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        category: "notification",
        organizationId,
        dedupeKey: boundedKey(dedupeKey),
      });
    },
    async sendDigest({ organizationId, to, dedupeKey, data }) {
      const rendered = await renderEmailForOrganisation("compliance-digest", data, {
        organizationId,
        ...(input.resolveBranding ? { resolveBranding: input.resolveBranding } : {}),
      });
      await input.email.sendTransactional({
        to,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        category: "notification",
        organizationId,
        dedupeKey: boundedKey(dedupeKey),
      });
    },
  };
}
