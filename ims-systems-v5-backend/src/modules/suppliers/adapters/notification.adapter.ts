/**
 * Supplier → Notifications adapter.
 */

import type { NotificationsApplicationPort } from "../../notifications";
import type { NotificationsUsersPort } from "../../notifications";
import type { SecurityIdentity } from "../../../security";
import type { SupplierNotificationPort } from "../ports";

function clip(message: string, max = 150): string {
  return message.length > max ? `${message.slice(0, max - 1)}…` : message;
}

export function createSupplierNotificationAdapter(deps: {
  notifications: NotificationsApplicationPort;
  users: NotificationsUsersPort;
}): SupplierNotificationPort {
  const { notifications, users } = deps;

  return {
    async notifyBuyerAssigned(input) {
      await notifications.createForRecipients({
        organizationId: input.organizationId,
        createdBy: input.buyerId,
        recipients: [
          {
            recipientUserId: input.buyerId,
            title: "Supplier assigned",
            message: clip(
              `You are buyer for ${input.reference}: ${input.name}`
            ),
            referenceType: "suppliers",
            referenceModuleId: input.supplierId,
            screenIdentifier: "supplier-detail",
            params: { id: input.supplierId },
          },
        ],
      });
    },

    async notifyCompliantSupplier(input) {
      const identity = {
        subjectId: "system",
        organizationId: input.organizationId,
      } as SecurityIdentity;
      const ids = await users.listActiveUserIds(identity);
      const recipients = [...new Set(ids)].filter(Boolean);
      if (recipients.length === 0) return;
      await notifications.createForRecipients({
        organizationId: input.organizationId,
        createdBy: recipients[0]!,
        recipients: recipients.map((recipientUserId) => ({
          recipientUserId,
          title: "Supplier compliant",
          message: clip(
            `${input.reference}: ${input.name} is now compliant`
          ),
          referenceType: "suppliers",
          referenceModuleId: input.supplierId,
          screenIdentifier: "supplier-detail",
          params: { id: input.supplierId },
        })),
      });
    },
  };
}
