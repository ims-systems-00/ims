import { z } from "zod";

const entrySchema = z.object({
  item: z.string().trim().min(1).max(500),
  unitPrice: z.number().positive(),
  units: z.number().int().positive(),
  vatRate: z.number().min(0).max(100),
});

export const createInvoiceBodySchema = z.object({
  customerId: z.string().trim().min(1),
  dueDate: z.string().trim().min(1),
  entries: z.array(entrySchema).min(1).max(200),
  discount: z.number().min(0).max(100).optional().default(0),
  send: z.boolean().optional().default(false),
});

export const updateInvoiceBodySchema = z.object({
  dueDate: z.string().trim().min(1).optional(),
  entries: z.array(entrySchema).min(1).max(200).optional(),
  discount: z.number().min(0).max(100).optional(),
});

export const listInvoicesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().trim().optional(),
  customerId: z.string().trim().optional(),
  status: z.enum(["Draft", "Sent", "Paid"]).optional(),
});

export const invoiceIdParamSchema = z.object({
  id: z.string().trim().min(1),
});
