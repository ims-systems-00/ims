/**
 * Real CustomerInvoiceStatsPort (N-15) backed by the Invoice module
 * repository: per-customer status buckets + manager this-month analysis.
 */

import { createInvoiceRepository } from "../../invoices/repositories/invoice.repository";
import type { CustomerInvoiceStatsPort } from "../ports";

export function createCustomerInvoiceStatsAdapter(deps?: {
  repository?: ReturnType<typeof createInvoiceRepository>;
}): CustomerInvoiceStatsPort {
  const repository = deps?.repository ?? createInvoiceRepository();
  return {
    async getCustomerInvoiceOverview({ organizationId, customerId }) {
      const byStatus = await repository.statsByCustomer(organizationId, customerId);
      return {
        totalInvoices: byStatus.reduce((s, b) => s + b.count, 0),
        byStatus,
      };
    },
    async getManagerInvoiceAnalysisThisMonth({ organizationId, managerId }) {
      return repository.statsByManagerThisMonth(organizationId, managerId);
    },
  };
}
