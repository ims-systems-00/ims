/**
 * Public surface for the Invoices module.
 * Other modules may import only from this entry.
 */

export { createInvoiceModule, type InvoiceRouterDeps } from "./routes/invoice.routes";
export {
  createInvoiceService,
  type InvoiceService,
  type InvoiceServiceDeps,
} from "./services/invoice.service";
export { computeInvoice } from "./services/calculations";
export { buildInvoicePdf } from "./services/invoice-pdf";
export {
  createInvoiceRepository,
  type InvoiceRepository,
} from "./repositories/invoice.repository";
export {
  NoOpInvoiceMailerAdapter,
  NoOpInvoiceNotificationAdapter,
} from "./ports";
export type {
  InvoiceCustomerPort,
  InvoiceCustomerSnapshot,
  InvoiceMailerPort,
  InvoiceNotificationPort,
} from "./ports";
export {
  INVOICES_RESOURCE,
  INVOICE_STATUSES,
  type CreateInvoiceInput,
  type Invoice,
  type InvoiceCalculations,
  type InvoiceEmailRecipient,
  type InvoiceEntry,
  type InvoiceEntryInput,
  type InvoiceStatus,
  type InvoiceStatusBucket,
  type ListInvoicesQuery,
  type PaginatedInvoices,
  type UpdateInvoiceInput,
} from "./types";
