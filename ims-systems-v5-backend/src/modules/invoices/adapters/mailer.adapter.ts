/**
 * Invoice email delivery via the shared EmailSystem: PDF attached,
 * sent to the customer's primary (and secondary) contact.
 */

import {
  renderEmailForOrganisation,
  type EmailBranding,
} from "../../../infrastructure/email/templates";
import type { EmailSystem } from "../../../infrastructure/queue";
import { NoOpInvoiceMailerAdapter, type InvoiceMailerPort } from "../ports";

export function createInvoiceMailerAdapter(
  email: EmailSystem | undefined,
  resolveEmailBranding?: (organizationId: string) => Promise<EmailBranding>
): InvoiceMailerPort {
  if (!email) return new NoOpInvoiceMailerAdapter();
  return {
    async sendInvoice({ invoice, recipients, pdfBase64 }) {
      for (const r of recipients) {
        const rendered = await renderEmailForOrganisation(
          "invoice",
          {
            recipientName: r.name,
            reference: invoice.reference,
            customerName: invoice.customerName,
            totalLabel: `£${invoice.calculations.total.toFixed(2)}`,
            dueDateLabel: new Date(invoice.dueDate).toLocaleDateString("en-GB"),
          },
          {
            organizationId: invoice.organizationId,
            resolveBranding: resolveEmailBranding,
          }
        );
        await email.sendTransactional({
          to: r.email,
          subject: rendered.subject,
          html: rendered.html,
          text: rendered.text,
          category: "transactional",
          organizationId: invoice.organizationId,
          attachments: [
            {
              filename: `Invoice#00${invoice.number}-${new Date().toISOString().slice(0, 10)}.pdf`,
              contentBase64: pdfBase64,
              type: "application/pdf",
            },
          ],
        });
      }
    },
  };
}
