/**
 * Invoice email delivery via the shared EmailSystem: PDF attached,
 * sent to the customer's primary (and secondary) contact.
 */

import type { EmailSystem } from "../../../infrastructure/queue";
import { NoOpInvoiceMailerAdapter, type InvoiceMailerPort } from "../ports";

const esc = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function createInvoiceMailerAdapter(
  email: EmailSystem | undefined,
): InvoiceMailerPort {
  if (!email) return new NoOpInvoiceMailerAdapter();
  return {
    async sendInvoice({ invoice, recipients, pdfBase64 }) {
      for (const r of recipients) {
        await email.sendTransactional({
          to: r.email,
          subject: `Invoice ${invoice.reference} from iMS Systems`,
          html: `<p>Hi ${esc(r.name)},</p><p>Invoice <strong>${esc(invoice.reference)}</strong> for <strong>${esc(invoice.customerName)}</strong> (£${invoice.calculations.total.toFixed(2)}, due ${new Date(invoice.dueDate).toLocaleDateString("en-GB")}) is attached.</p>`,
          text: `Invoice ${invoice.reference} for ${invoice.customerName} (£${invoice.calculations.total.toFixed(2)}) is attached.`,
          category: "transactional",
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
