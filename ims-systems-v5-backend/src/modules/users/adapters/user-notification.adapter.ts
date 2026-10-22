/**
 * Real UserNotificationPort (N-12) — account lifecycle emails
 * (welcome / access revoked / verification resend) via the shared
 * EmailSystem. Delivery itself is gated by EMAIL_ENABLED + provider
 * credentials; the adapter NoOps only when no EmailSystem is composed.
 */

import type { EmailSystem } from "../../../infrastructure/queue";
import { NoOpUserNotificationAdapter, type UserNotificationPort } from "../ports";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function createUserNotificationAdapter(
  email: EmailSystem | undefined
): UserNotificationPort {
  if (!email) return new NoOpUserNotificationAdapter();

  return {
    async sendWelcome(to, name) {
      await email.sendTransactional({
        to,
        subject: "Welcome to iMS Systems",
        html: `<p>Hi ${escapeHtml(name)},</p><p>Your iMS Systems account is now active. You can sign in and start working with your organisation.</p>`,
        text: `Hi ${name}, your iMS Systems account is now active. You can sign in and start working with your organisation.`,
        category: "transactional",
      });
    },

    async sendAccessRevoked(to, name) {
      await email.sendTransactional({
        to,
        subject: "Your iMS Systems access has changed",
        html: `<p>Hi ${escapeHtml(name)},</p><p>Your access to iMS Systems has been revoked or deactivated by your organisation. If you believe this is a mistake, please contact your organisation administrator.</p>`,
        text: `Hi ${name}, your access to iMS Systems has been revoked or deactivated by your organisation. If you believe this is a mistake, please contact your organisation administrator.`,
        category: "transactional",
      });
    },

    async resendEmailVerification(to, name) {
      await email.sendTransactional({
        to,
        subject: "Verify your iMS Systems email",
        html: `<p>Hi ${escapeHtml(name)},</p><p>Please verify this email address for your iMS Systems account. If you did not request this, you can ignore this message.</p>`,
        text: `Hi ${name}, please verify this email address for your iMS Systems account. If you did not request this, you can ignore this message.`,
        category: "transactional",
      });
    },
  };
}
