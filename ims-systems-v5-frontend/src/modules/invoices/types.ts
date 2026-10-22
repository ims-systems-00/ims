export type InvoiceStatus = "Draft" | "Sent" | "Paid";

export type InvoiceEntry = {
  item: string;
  unitPrice: number;
  units: number;
  vatRate: number;
  vatFigure: number;
  subtotal: number;
};

export type Invoice = {
  id: string;
  number: number;
  reference: string;
  organizationId: string;
  customerId: string;
  customerName: string;
  groupId: string | null;
  accountManagerId: string | null;
  status: InvoiceStatus;
  dueDate: string;
  entries: InvoiceEntry[];
  calculations: { total: number; vatFigure: number; discount: number };
  emails: { name: string; email: string }[];
  createdBy: string;
  createdOn: string;
};

export type PaginatedInvoices = {
  items: Invoice[];
  page: number;
  pageSize: number;
  total: number;
};

export type CreateInvoiceInput = {
  customerId: string;
  dueDate: string;
  entries: { item: string; unitPrice: number; units: number; vatRate: number }[];
  discount?: number;
  send?: boolean;
};
