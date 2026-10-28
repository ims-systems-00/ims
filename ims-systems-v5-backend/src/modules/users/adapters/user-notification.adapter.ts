/**
 * Real UserNotificationPort (N-12) — account lifecycle emails
 * (welcome / access revoked / verification resend) via the shared
 * EmailSystem. Delivery itself is gated by EMAIL_ENABLED + provider
 * credentials; the adapter NoOps only when no EmailSystem is composed.
 */

import {
  renderEmail,
  renderEmailForOrganisation,
  type EmailBranding,
} from "../../../infrastructure/email/templates";
import type { EmailSystem } from "../../../infrastructure/queue";
import { NoOpUserNotificationAdapter, type UserNotificationPort } from "../ports";

export function createUserNotificationAdapter(
  email: EmailSystem | undefined,
  resolveEmailBranding?: (organizationId: string) => Promise<EmailBranding>
): UserNotificationPort {
  if (!email) return new NoOpUserNotificationAdapter();

  async function renderLifecycle(
    id: "welcome" | "access-revoked" | "email-verification",
    name: string,
    organizationId?: string
  ) {
    if (organizationId && resolveEmailBranding) {
      return renderEmailForOrganisation(id, { name }, {
        organizationId,
        resolveBranding: resolveEmailBranding,
      });
    }
    return renderEmail(id, { name });
  }

  return {
    async sendWelcome(to, name, organizationId) {
      const rendered = await renderLifecycle("welcome", name, organizationId);
      await email.sendTransactional({
        to,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        category: "transactional",
        organizationId,
      });
    },

    async sendAccessRevoked(to, name, organizationId) {
      const rendered = await renderLifecycle(
        "access-revoked",
        name,
        organizationId
      );
      await email.sendTransactional({
        to,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        category: "transactional",
        organizationId,
      });
    },

    async resendEmailVerification(to, name, organizationId) {
      const rendered = await renderLifecycle(
        "email-verification",
        name,
        organizationId
      );
      await email.sendTransactional({
        to,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        category: "transactional",
        organizationId,
      });
    },
  };
}
