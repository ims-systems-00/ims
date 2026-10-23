/**
 * Invoice module ports: customer snapshot, email delivery, and
 * account-manager notifications. Real adapters live in ./adapters
 * or are composed in the v1 router.
 */

import type { Invoice } from "./types";

export type InvoiceCustomerSnapshot = {
  id: string;
  name: string;
  businessUnitId: string | null;
  accountManagerId: string | null;
  primaryContact: string | null;
  primaryEmail: string | null;
  secondaryContact: string | null;
  secondaryEmail: string | null;
};

export interface InvoiceCustomerPort {
  getCustomer(
    organizationId: string,
    customerId: string,
  ): Promise<InvoiceCustomerSnapshot | null>;
}

export interface InvoiceMailerPort {
  sendInvoice(input: {
    invoice: Invoice;
    recipients: { name: string; email: string }[];
    pdfBase64: string;
  }): Promise<void>;
}

export class NoOpInvoiceMailerAdapter implements InvoiceMailerPort {
  async sendInvoice(): Promise<void> {
    return;
  }
}

export interface InvoiceNotificationPort {
  notifyAccountManager(input: {
    organizationId: string;
    actorId: string;
    accountManagerId: string;
    invoiceId: string;
    reference: string;
    event: "created" | "sent" | "paid";
  }): Promise<void>;
}

export class NoOpInvoiceNotificationAdapter implements InvoiceNotificationPort {
  async notifyAccountManager(): Promise<void> {
    return;
  }
}
