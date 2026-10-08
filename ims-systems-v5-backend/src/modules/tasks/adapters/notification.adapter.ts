/**
 * Task → Notifications adapter.
 */

import type { NotificationsApplicationPort } from "../../notifications";
import type { TaskNotificationPort } from "../ports";

function clip(message: string, max = 150): string {
  return message.length > max ? `${message.slice(0, max - 1)}…` : message;
}

export function createTaskNotificationAdapter(
  notifications: NotificationsApplicationPort
): TaskNotificationPort {
  return {
    async notifyAssigneesAssigned(input) {
      const recipients = [...new Set(input.assigneeIds)].filter(Boolean);
      if (recipients.length === 0) return;
      await notifications.createForRecipients({
        organizationId: input.organizationId,
        createdBy: recipients[0]!,
        recipients: recipients.map((recipientUserId) => ({
          recipientUserId,
          title: "Task assigned",
          message: clip(`You were assigned ${input.reference}: ${input.name}`),
          referenceType: "tasks",
          referenceModuleId: input.taskId,
          screenIdentifier: "task-manager-detail",
          params: { id: input.taskId },
        })),
      });
    },

    async notifyCreatorAccepted(input) {
      if (!input.creatorId || input.creatorId === input.acceptorId) return;
      await notifications.createForRecipients({
        organizationId: input.organizationId,
        createdBy: input.acceptorId,
        recipients: [
          {
            recipientUserId: input.creatorId,
            title: "Task accepted",
            message: clip(
              `${input.reference}: ${input.name} was accepted`
            ),
            referenceType: "tasks",
            referenceModuleId: input.taskId,
            screenIdentifier: "task-manager-detail",
            params: { id: input.taskId },
          },
        ],
      });
    },

    async notifyCreatorDeclined(input) {
      if (!input.creatorId || input.creatorId === input.declinerId) return;
      await notifications.createForRecipients({
        organizationId: input.organizationId,
        createdBy: input.declinerId,
        recipients: [
          {
            recipientUserId: input.creatorId,
            title: "Task declined",
            message: clip(
              `${input.reference}: ${input.name} was declined`
            ),
            referenceType: "tasks",
            referenceModuleId: input.taskId,
            screenIdentifier: "task-manager-detail",
            params: { id: input.taskId },
          },
        ],
      });
    },

    async notifyCreatorCompleted(input) {
      if (!input.creatorId || input.creatorId === input.completedBy) return;
      await notifications.createForRecipients({
        organizationId: input.organizationId,
        createdBy: input.completedBy,
        recipients: [
          {
            recipientUserId: input.creatorId,
            title: "Task completed",
            message: clip(
              `${input.reference}: ${input.name} was completed`
            ),
            referenceType: "tasks",
            referenceModuleId: input.taskId,
            screenIdentifier: "task-manager-detail",
            params: { id: input.taskId },
          },
        ],
      });
    },

    async notifyNudge(input) {
      const recipients = [...new Set(input.assigneeIds)].filter(Boolean);
      if (recipients.length === 0) return;
      await notifications.createForRecipients({
        organizationId: input.organizationId,
        createdBy: recipients[0]!,
        recipients: recipients.map((recipientUserId) => ({
          recipientUserId,
          title: "Task nudge",
          message: clip(
            `Please look at ${input.reference}: ${input.name}`
          ),
          referenceType: "tasks",
          referenceModuleId: input.taskId,
          screenIdentifier: "task-manager-detail",
          params: { id: input.taskId },
          popUpStatus: "unread",
        })),
      });
    },
  };
}
