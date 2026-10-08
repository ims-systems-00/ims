/**
 * Incident → Notifications adapter.
 */

import type { NotificationsApplicationPort } from "../../notifications";
import type { NotificationsUsersPort } from "../../notifications";
import type { SecurityIdentity } from "../../../security";
import type { IncidentNotificationPort } from "../ports";

function clip(message: string, max = 150): string {
  return message.length > max ? `${message.slice(0, max - 1)}…` : message;
}

export function createIncidentNotificationAdapter(deps: {
  notifications: NotificationsApplicationPort;
  users: NotificationsUsersPort;
}): IncidentNotificationPort {
  const { notifications, users } = deps;

  async function fanOut(
    organizationId: string,
    createdBy: string,
    excludeIds: string[],
    build: (recipientUserId: string) => {
      recipientUserId: string;
      title: string;
      message: string;
      referenceType: "incidents";
      referenceModuleId: string;
      screenIdentifier: string;
      params: { id: string };
      popUpStatus?: "unread" | "read";
    }
  ) {
    const identity = {
      subjectId: createdBy,
      organizationId,
    } as SecurityIdentity;
    const ids = await users.listActiveUserIds(identity);
    const exclude = new Set(excludeIds.filter(Boolean));
    const recipients = [...new Set(ids)]
      .filter((id) => !exclude.has(id))
      .map(build);
    if (recipients.length === 0) return;
    await notifications.createForRecipients({
      organizationId,
      createdBy,
      recipients,
    });
  }

  return {
    async notifyOwnerAssigned(input) {
      await notifications.createForRecipients({
        organizationId: input.organizationId,
        createdBy: input.ownerId,
        recipients: [
          {
            recipientUserId: input.ownerId,
            title: "Incident assigned",
            message: clip(
              `You own ${input.reference}: ${input.title}`
            ),
            referenceType: "incidents",
            referenceModuleId: input.incidentId,
            screenIdentifier: "incident-management-detail",
            params: { id: input.incidentId },
          },
        ],
      });
    },

    async notifyEscalated(input) {
      await fanOut(
        input.organizationId,
        input.escalatedBy,
        [input.escalatedBy],
        (recipientUserId) => ({
          recipientUserId,
          title: "Incident escalated",
          message: clip(
            `${input.reference} ${input.title} was escalated`
          ),
          referenceType: "incidents",
          referenceModuleId: input.incidentId,
          screenIdentifier: "incident-management-detail",
          params: { id: input.incidentId },
          popUpStatus: "unread",
        })
      );
    },

    async notifyResolved(input) {
      await fanOut(
        input.organizationId,
        input.resolvedBy,
        [input.resolvedBy],
        (recipientUserId) => ({
          recipientUserId,
          title: "Incident resolved",
          message: clip(
            `${input.reference} ${input.title} was resolved`
          ),
          referenceType: "incidents",
          referenceModuleId: input.incidentId,
          screenIdentifier: "incident-management-detail",
          params: { id: input.incidentId },
        })
      );
    },

    async notifyNudge(input) {
      await notifications.createForRecipients({
        organizationId: input.organizationId,
        createdBy: input.ownerId,
        recipients: [
          {
            recipientUserId: input.ownerId,
            title: "Incident nudge",
            message: clip(
              `Please look at ${input.reference}: ${input.title}`
            ),
            referenceType: "incidents",
            referenceModuleId: input.incidentId,
            screenIdentifier: "incident-management-detail",
            params: { id: input.incidentId },
            popUpStatus: "unread",
          },
        ],
      });
    },
  };
}
