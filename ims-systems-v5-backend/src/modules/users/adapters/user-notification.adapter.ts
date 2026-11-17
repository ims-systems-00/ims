/**
 * Real UserNotificationPort (N-12) — account lifecycle emails
 * (welcome / access revoked / verification resend) via the shared
 * EmailSystem. Delivery itself is gated by EMAIL_ENABLED + provider
 * credentials; the adapter NoOps only when no EmailSystem is composed.
 */

import { loadServiceCharterAttachment } from "../../../infrastructure/email/onboarding-attachments";
import {
  renderEmail,
  renderEmailForOrganisation,
  type EmailBranding,
} from "../../../infrastructure/email/templates";
import type { Logger } from "../../../infrastructure/logging/logger";
import type { EmailSystem } from "../../../infrastructure/queue";
import {
  NoOpUserNotificationAdapter,
  type SendWelcomeOptions,
  type UserNotificationPort,
} from "../ports";

export function createUserNotificationAdapter(
  email: EmailSystem | undefined,
  resolveEmailBranding?: (organizationId: string) => Promise<EmailBranding>,
  logger?: Logger
): UserNotificationPort {
  if (!email) return new NoOpUserNotificationAdapter();

  async function renderLifecycle(
    id: "access-revoked" | "email-verification",
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

  async function renderWelcomeEmail(
    name: string,
    organizationId: string | undefined,
    includeServiceCharter: boolean
  ) {
    const data = { name, includeServiceCharter };
    if (organizationId && resolveEmailBranding) {
      return renderEmailForOrganisation("welcome", data, {
        organizationId,
        resolveBranding: resolveEmailBranding,
      });
    }
    return renderEmail("welcome", data);
  }

  return {
    async sendWelcome(to, name, organizationId, options?: SendWelcomeOptions) {
      const attachCharter = Boolean(options?.attachServiceCharter);
      const rendered = await renderWelcomeEmail(
        name,
        organizationId,
        attachCharter
      );
      const attachments = attachCharter
        ? loadServiceCharterAttachment(logger)
        : undefined;
      await email.sendTransactional({
        to,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        category: "transactional",
        organizationId,
        ...(attachments && attachments.length > 0 ? { attachments } : {}),
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
