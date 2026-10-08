/**
 * OFI → Notifications adapter.
 */

import type { NotificationsApplicationPort } from "../../notifications";
import type { NotificationsUsersPort } from "../../notifications";
import type { SecurityIdentity } from "../../../security";
import type { OfiNotificationPort } from "../ports";

function clip(message: string, max = 150): string {
  return message.length > max ? `${message.slice(0, max - 1)}…` : message;
}

export function createOfiNotificationAdapter(deps: {
  notifications: NotificationsApplicationPort;
  users: NotificationsUsersPort;
}): OfiNotificationPort {
  const { notifications, users } = deps;

  return {
    async notifyOwnerAssigned(input) {
      await notifications.createForRecipients({
        organizationId: input.organizationId,
        createdBy: input.ownerId,
        recipients: [
          {
            recipientUserId: input.ownerId,
            title: "OFI assigned",
            message: clip(
              `You own ${input.reference}: ${input.title}`
            ),
            referenceType: "ofi",
            referenceModuleId: input.ofiId,
            screenIdentifier: "ofi-detail",
            params: { id: input.ofiId },
          },
        ],
      });
    },

    async notifyImplemented(input) {
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
          title: "OFI implemented",
          message: clip(
            `${input.reference} ${input.title} was marked implemented`
          ),
          referenceType: "ofi",
          referenceModuleId: input.ofiId,
          screenIdentifier: "ofi-detail",
          params: {
            id: input.ofiId,
            businessUnitId: input.businessUnitId,
          },
        })),
      });
    },

    async notifyNudge(input) {
      await notifications.createForRecipients({
        organizationId: input.organizationId,
        createdBy: input.ownerId,
        recipients: [
          {
            recipientUserId: input.ownerId,
            title: "OFI nudge",
            message: clip(
              `Please look at ${input.reference}: ${input.title}`
            ),
            referenceType: "ofi",
            referenceModuleId: input.ofiId,
            screenIdentifier: "ofi-detail",
            params: { id: input.ofiId },
            popUpStatus: "unread",
          },
        ],
      });
    },
  };
}
