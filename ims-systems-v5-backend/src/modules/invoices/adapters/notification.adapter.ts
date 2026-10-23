/**
 * Invoice → Notifications adapter: account manager is notified when an
 * invoice is created, sent, or marked paid (spec §2).
 */

import type { NotificationsApplicationPort } from "../../notifications";
import type { InvoiceNotificationPort } from "../ports";

const TITLES = {
  created: "Invoice created",
  sent: "Invoice sent",
  paid: "Invoice marked as paid",
} as const;

export function createInvoiceNotificationAdapter(
  notifications: NotificationsApplicationPort,
): InvoiceNotificationPort {
  return {
    async notifyAccountManager(input) {
      await notifications.createForRecipients({
        organizationId: input.organizationId,
        createdBy: input.actorId,
        recipients: [
          {
            recipientUserId: input.accountManagerId,
            title: TITLES[input.event],
            message: `Invoice ${input.reference} was ${input.event}.`,
            referenceType: "customers",
            referenceModuleId: input.invoiceId,
            screenIdentifier: "invoice-detail",
            params: { id: input.invoiceId },
          },
        ],
      });
    },
  };
}
