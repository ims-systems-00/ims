import { apiRequest } from "@/shared/lib/http";
import type {
  CreateInvoiceInput,
  Invoice,
  InvoiceStatus,
  ListInvoicesParams,
  PaginatedInvoices,
} from "../types";

export function listInvoices(
  params: ListInvoicesParams = {}
): Promise<PaginatedInvoices> {
  const q = new URLSearchParams();
  if (params.customerId) q.set("customerId", params.customerId);
  if (params.page) q.set("page", String(params.page));
  if (params.pageSize) q.set("pageSize", String(params.pageSize));
  if (params.search) q.set("search", params.search);
  if (params.status) q.set("status", params.status);
  const qs = q.toString();
  return apiRequest<PaginatedInvoices>(`/invoices${qs ? `?${qs}` : ""}`);
}

export function getInvoice(id: string): Promise<Invoice> {
  return apiRequest<Invoice>(`/invoices/${encodeURIComponent(id)}`);
}

export type { InvoiceStatus };

export function createInvoice(input: CreateInvoiceInput): Promise<Invoice> {
  return apiRequest<Invoice>("/invoices", { method: "POST", body: input });
}

export function sendInvoice(id: string): Promise<Invoice> {
  return apiRequest<Invoice>(`/invoices/${id}/send`, { method: "POST", body: {} });
}

export function markInvoicePaid(id: string): Promise<Invoice> {
  return apiRequest<Invoice>(`/invoices/${id}/mark-paid`, { method: "POST", body: {} });
}

export function deleteInvoice(id: string): Promise<{ id: string }> {
  return apiRequest<{ id: string }>(`/invoices/${id}`, { method: "DELETE" });
}

export function downloadInvoice(id: string): Promise<{ filename: string; contentBase64: string }> {
  return apiRequest(`/invoices/${id}/download`);
}
