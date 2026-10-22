/**
 * Invoice PDF generation (pdf-lib): billed-from / billed-to, line
 * items, VAT, discount, total. Used for email attachment + download.
 */

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Invoice } from "../types";

const gbp = (n: number) => `£${n.toFixed(2)}`;
const dateStr = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-GB", { dateStyle: "medium" });

export async function buildInvoicePdf(
  invoice: Invoice,
  issuerName: string,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const { height } = page.getSize();
  let y = height - 50;

  const line = (text: string, size = 10, isBold = false, x = 50) => {
    page.drawText(text, {
      x,
      y,
      size,
      font: isBold ? bold : font,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= size + 6;
  };

  line(`Invoice ${invoice.reference}`, 18, true);
  line(`Invoice#00${invoice.number} · Status: ${invoice.status}`);
  y -= 8;
  line("Billed from", 11, true);
  line(issuerName);
  y -= 8;
  line("Billed to", 11, true);
  line(invoice.customerName);
  line(`Due date: ${dateStr(invoice.dueDate)}`);
  y -= 12;

  line("Items", 11, true);
  for (const e of invoice.entries) {
    line(
      `${e.item} — ${e.units} × ${gbp(e.unitPrice)} + VAT ${e.vatRate}% (${gbp(e.vatFigure)}) = ${gbp(e.subtotal)}`,
    );
  }
  y -= 8;
  if (invoice.calculations.discount > 0) {
    line(`Discount: ${invoice.calculations.discount}%`);
  }
  line(`Total VAT: ${gbp(invoice.calculations.vatFigure)}`);
  line(`Total: ${gbp(invoice.calculations.total)}`, 12, true);
  y -= 16;
  line(`Thank you for your business with ${issuerName}`, 9);
  line("Powered by iMS Systems", 8);

  return pdf.save();
}
