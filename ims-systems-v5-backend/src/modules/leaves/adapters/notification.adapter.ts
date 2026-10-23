/**
 * Leaves → Notifications adapter.
 */

import type { NotificationsApplicationPort } from "../../notifications";
import type { LeavesNotificationPort } from "../ports";

export function createLeavesNotificationAdapter(
  notifications: NotificationsApplicationPort
): LeavesNotificationPort {
  return {
    async notifySubmitted(input) {
      const recipients = [...new Set(input.lineManagerIds)].filter(Boolean);
      if (recipients.length === 0) return;
      await notifications.createForRecipients({
        organizationId: input.organizationId,
        createdBy: input.requesterId,
        recipients: recipients.map((recipientUserId) => ({
          recipientUserId,
          title: "Leave request submitted",
          message: `Leave request ${input.reference} is awaiting your review.`,
          referenceType: "leaves",
          referenceModuleId: input.leaveId,
          screenIdentifier: "leave-detail",
          params: { id: input.leaveId },
        })),
      });
    },

    async notifyDecision(input) {
      const outcome = input.status === "Approved" ? "approved" : "rejected";
      await notifications.createForRecipients({
        organizationId: input.organizationId,
        createdBy: input.decisionMakerId,
        recipients: [
          {
            recipientUserId: input.requesterId,
            title: `Leave request ${outcome}`,
            message: `Your leave request ${input.reference} has been ${outcome}.`,
            referenceType: "leaves",
            referenceModuleId: input.leaveId,
            screenIdentifier: "leave-detail",
            params: { id: input.leaveId },
          },
        ],
      });
    },
  };
}
