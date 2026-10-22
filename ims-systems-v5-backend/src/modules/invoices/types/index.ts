/**
 * CRM Invoice module types.
 * Spec: docs/module-specifications/invoice.md
 * Lifecycle: Draft → Sent → Paid (manual paid marking, no gateway).
 */

export const INVOICES_RESOURCE = "customers"; // CRM permissions govern invoices.

export const INVOICE_STATUSES = ["Draft", "Sent", "Paid"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export type InvoiceEntry = {
  item: string;
  unitPrice: number;
  units: number;
  vatRate: number;
  vatFigure: number;
  subtotal: number;
};

export type InvoiceCalculations = {
  total: number;
  vatFigure: number;
  discount: number; // percent 0–100
};

export type InvoiceEmailRecipient = {
  name: string;
  email: string;
};

export type Invoice = {
  id: string;
  /** Sequential per-organisation number; reference = INV-{number}. */
  number: number;
  reference: string;
  organizationId: string;
  customerId: string;
  customerName: string;
  /** Business unit / group copied from the customer at creation. */
  groupId: string | null;
  accountManagerId: string | null;
  status: InvoiceStatus;
  dueDate: Date;
  entries: InvoiceEntry[];
  calculations: InvoiceCalculations;
  emails: InvoiceEmailRecipient[];
  createdBy: string;
  createdOn: Date;
  updatedBy: string | null;
  updatedOn: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type InvoiceEntryInput = {
  item: string;
  unitPrice: number;
  units: number;
  vatRate: number;
};

export type CreateInvoiceInput = {
  customerId: string;
  dueDate: string;
  entries: InvoiceEntryInput[];
  discount?: number;
  /** Create then immediately email to customer contacts. */
  send?: boolean;
};

export type UpdateInvoiceInput = {
  dueDate?: string;
  entries?: InvoiceEntryInput[];
  discount?: number;
};

export type ListInvoicesQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  customerId?: string;
  status?: InvoiceStatus;
};

export type PaginatedInvoices = {
  items: Invoice[];
  page: number;
  pageSize: number;
  total: number;
};

export type InvoiceStatusBucket = {
  status: string;
  amount: number;
  count: number;
};
