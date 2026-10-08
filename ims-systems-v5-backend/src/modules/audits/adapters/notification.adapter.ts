/**
 * Audit → Notifications adapter.
 */

import type { NotificationsApplicationPort } from "../../notifications";
import type { AuditNotificationPort } from "../ports";

function clip(message: string, max = 150): string {
  return message.length > max ? `${message.slice(0, max - 1)}…` : message;
}

export function createAuditNotificationAdapter(
  notifications: NotificationsApplicationPort
): AuditNotificationPort {
  return {
    async notifyScheduled(input) {
      await notifications.createForRecipients({
        organizationId: input.organizationId,
        createdBy: input.auditorId,
        recipients: [
          {
            recipientUserId: input.auditorId,
            title: "Audit scheduled",
            message: clip(
              `${input.reference}: ${input.title} is scheduled`
            ),
            referenceType: "audits",
            referenceModuleId: input.auditId,
            screenIdentifier: "audit-detail",
            params: {
              id: input.auditId,
              businessUnitId: input.businessUnitId,
            },
          },
        ],
      });
    },
  };
}
