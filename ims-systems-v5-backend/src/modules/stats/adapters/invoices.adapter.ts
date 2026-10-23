/**
 * Real StatsInvoicesPort (N-17): monthly Sent invoice count/amount
 * over the last 12 months (spec: Sent only), zero-filled by the
 * stats service when months are missing.
 */

import { createInvoiceRepository } from "../../invoices/repositories/invoice.repository";
import type { StatsInvoicesPort } from "../ports";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function createStatsInvoicesAdapter(deps?: {
  repository?: ReturnType<typeof createInvoiceRepository>;
}): StatsInvoicesPort {
  const repository = deps?.repository ?? createInvoiceRepository();
  return {
    async monthlySentLast12Months(identity) {
      if (!identity.organizationId) return [];
      const rows = await repository.monthlySentLast12Months(identity.organizationId);
      return rows.map((r) => ({
        year: r.year,
        month: r.month,
        label: `${MONTH_LABELS[r.month - 1]} ${r.year}`,
        count: r.count,
        amount: r.amount,
      }));
    },
  };
}
