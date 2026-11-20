/**
 * Management Review → Notifications adapter.
 *
 * Schedule creates many review occurrences (e.g. Monthly → 12). Notify once
 * per attendee with a series digest instead of N×A separate messages.
 */

import type { NotificationsApplicationPort } from "../../notifications";
import type { ManagementReviewNotificationPort } from "../ports";

function clip(message: string, max = 150): string {
  return message.length > max ? `${message.slice(0, max - 1)}…` : message;
}

function formatDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function buildDigestMessage(input: {
  title: string;
  interval: string;
  occurrences: Array<{ reference: string; date: Date }>;
}): string {
  const count = input.occurrences.length;
  if (count === 0) {
    return `${input.title} was scheduled`;
  }
  if (count === 1) {
    const only = input.occurrences[0]!;
    return `${only.reference}: ${input.title} is scheduled for ${formatDay(only.date)}`;
  }
  const first = input.occurrences[0]!;
  const last = input.occurrences[count - 1]!;
  return `${input.title} scheduled (${input.interval}): ${count} reviews from ${formatDay(first.date)} to ${formatDay(last.date)} (${first.reference} … ${last.reference})`;
}

export function createManagementReviewNotificationAdapter(
  notifications: NotificationsApplicationPort
): ManagementReviewNotificationPort {
  return {
    async notifyScheduled(input) {
      const recipients = [...new Set(input.attendeeIds)].filter(Boolean);
      if (recipients.length === 0) return;

      const message = clip(
        buildDigestMessage({
          title: input.title,
          interval: input.interval,
          occurrences: input.occurrences,
        })
      );

      await notifications.createForRecipients({
        organizationId: input.organizationId,
        createdBy: recipients[0]!,
        recipients: recipients.map((recipientUserId) => ({
          recipientUserId,
          title:
            input.occurrences.length > 1
              ? "Management review series scheduled"
              : "Management review scheduled",
          message,
          referenceType: "management-reviews",
          referenceModuleId: input.reviewId,
          screenIdentifier: "management-review-detail",
          params: {
            id: input.reviewId,
            businessUnitId: input.businessUnitId,
            occurrenceCount: input.occurrences.length,
          },
        })),
      });
    },
  };
}
