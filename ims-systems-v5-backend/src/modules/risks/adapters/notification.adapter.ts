/**
 * Risk → Notifications adapter.
 */

import type { NotificationsApplicationPort } from "../../notifications";
import type { NotificationsUsersPort } from "../../notifications";
import type { SecurityIdentity } from "../../../security";
import type { RiskNotificationPort } from "../ports";

function clip(message: string, max = 150): string {
  return message.length > max ? `${message.slice(0, max - 1)}…` : message;
}

export function createRiskNotificationAdapter(deps: {
  notifications: NotificationsApplicationPort;
  users: NotificationsUsersPort;
}): RiskNotificationPort {
  const { notifications, users } = deps;

  async function fanOut(
    organizationId: string,
    createdBy: string,
    excludeIds: string[],
    build: (recipientUserId: string) => {
      recipientUserId: string;
      title: string;
      message: string;
      referenceType: "risks";
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
            title: "Risk assigned",
            message: clip(
              `You own ${input.reference}: ${input.title}`
            ),
            referenceType: "risks",
            referenceModuleId: input.riskId,
            screenIdentifier: "risk-management-detail",
            params: { id: input.riskId },
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
          title: "Risk escalated",
          message: clip(
            `${input.reference} ${input.title} was escalated`
          ),
          referenceType: "risks",
          referenceModuleId: input.riskId,
          screenIdentifier: "risk-management-detail",
          params: { id: input.riskId },
          popUpStatus: "unread",
        })
      );
    },

    async notifyMitigated(input) {
      await fanOut(
        input.organizationId,
        input.mitigatedBy,
        [input.mitigatedBy],
        (recipientUserId) => ({
          recipientUserId,
          title: "Risk mitigated",
          message: clip(
            `${input.reference} ${input.title} was marked mitigated`
          ),
          referenceType: "risks",
          referenceModuleId: input.riskId,
          screenIdentifier: "risk-management-detail",
          params: { id: input.riskId },
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
            title: "Risk nudge",
            message: clip(
              `Please look at ${input.reference}: ${input.title}`
            ),
            referenceType: "risks",
            referenceModuleId: input.riskId,
            screenIdentifier: "risk-management-detail",
            params: { id: input.riskId },
            popUpStatus: "unread",
          },
        ],
      });
    },
  };
}
