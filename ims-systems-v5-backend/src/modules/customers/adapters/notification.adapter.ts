/**
 * Customer → Notifications adapter.
 */

import type { NotificationsApplicationPort } from "../../notifications";
import type { CustomerNotificationPort } from "../ports";

function clip(message: string, max = 150): string {
  return message.length > max ? `${message.slice(0, max - 1)}…` : message;
}

function unique(ids: Array<string | undefined>): string[] {
  return [...new Set(ids.filter((id): id is string => Boolean(id)))];
}

export function createCustomerNotificationAdapter(
  notifications: NotificationsApplicationPort
): CustomerNotificationPort {
  return {
    async notifyStageChanged(input) {
      const recipients = unique([
        input.accountManagerId,
        input.createdBy,
      ]);
      if (recipients.length === 0) return;
      await notifications.createForRecipients({
        organizationId: input.organizationId,
        createdBy: input.createdBy,
        recipients: recipients.map((recipientUserId) => ({
          recipientUserId,
          title: "Customer stage changed",
          message: clip(
            `${input.reference}: ${input.name} moved ${input.previousStage} → ${input.stage}`
          ),
          referenceType: "customers",
          referenceModuleId: input.customerId,
          screenIdentifier: "customer-detail",
          params: { id: input.customerId },
        })),
      });
    },

    async notifyStatusChanged(input) {
      const recipients = unique([
        input.accountManagerId,
        input.createdBy,
      ]);
      if (recipients.length === 0) return;
      await notifications.createForRecipients({
        organizationId: input.organizationId,
        createdBy: input.createdBy,
        recipients: recipients.map((recipientUserId) => ({
          recipientUserId,
          title: "Customer status changed",
          message: clip(
            `${input.reference}: ${input.name} moved ${input.previousStatus} → ${input.status}`
          ),
          referenceType: "customers",
          referenceModuleId: input.customerId,
          screenIdentifier: "customer-detail",
          params: { id: input.customerId },
        })),
      });
    },

    async notifyAccountManagerAssigned(input) {
      await notifications.createForRecipients({
        organizationId: input.organizationId,
        createdBy: input.accountManagerId,
        recipients: [
          {
            recipientUserId: input.accountManagerId,
            title: "Account manager assigned",
            message: clip(
              `You manage ${input.reference}: ${input.name}`
            ),
            referenceType: "customers",
            referenceModuleId: input.customerId,
            screenIdentifier: "customer-detail",
            params: { id: input.customerId },
          },
        ],
      });
    },
  };
}
