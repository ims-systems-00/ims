/**
 * Management Review → Notifications adapter.
 */

import type { NotificationsApplicationPort } from "../../notifications";
import type { ManagementReviewNotificationPort } from "../ports";

function clip(message: string, max = 150): string {
  return message.length > max ? `${message.slice(0, max - 1)}…` : message;
}

export function createManagementReviewNotificationAdapter(
  notifications: NotificationsApplicationPort
): ManagementReviewNotificationPort {
  return {
    async notifyScheduled(input) {
      const recipients = [...new Set(input.attendeeIds)].filter(Boolean);
      if (recipients.length === 0) return;
      await notifications.createForRecipients({
        organizationId: input.organizationId,
        createdBy: recipients[0]!,
        recipients: recipients.map((recipientUserId) => ({
          recipientUserId,
          title: "Management review scheduled",
          message: clip(
            `${input.reference}: ${input.title} is scheduled`
          ),
          referenceType: "management-reviews",
          referenceModuleId: input.reviewId,
          screenIdentifier: "management-review-detail",
          params: {
            id: input.reviewId,
            businessUnitId: input.businessUnitId,
          },
        })),
      });
    },
  };
}
