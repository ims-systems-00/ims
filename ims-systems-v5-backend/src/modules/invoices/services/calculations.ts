import type { InvoiceCalculations, InvoiceEntry, InvoiceEntryInput } from "../types";

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Spec §9 financial rules:
 * line VAT = price × units × rate/100; line subtotal = price×units + VAT;
 * invoice total = Σ subtotals − discount% of Σ subtotals.
 */
export function computeInvoice(
  entries: InvoiceEntryInput[],
  discount = 0,
): { entries: InvoiceEntry[]; calculations: InvoiceCalculations } {
  const computed = entries.map((e) => {
    const vatFigure = round2(e.unitPrice * e.units * (e.vatRate / 100));
    const subtotal = round2(e.unitPrice * e.units + vatFigure);
    return { ...e, vatFigure, subtotal };
  });
  const sumSubtotals = round2(computed.reduce((s, e) => s + e.subtotal, 0));
  const vatFigure = round2(computed.reduce((s, e) => s + e.vatFigure, 0));
  const total = round2(sumSubtotals - (sumSubtotals * discount) / 100);
  return { entries: computed, calculations: { total, vatFigure, discount } };
}
