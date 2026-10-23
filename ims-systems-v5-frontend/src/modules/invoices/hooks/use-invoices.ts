import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createInvoice,
  deleteInvoice,
  downloadInvoice,
  getInvoice,
  listInvoices,
  markInvoicePaid,
  sendInvoice,
} from "../api/invoices";
import type { CreateInvoiceInput, ListInvoicesParams } from "../types";

export const invoiceKeys = {
  all: ["invoices"] as const,
  lists: () => [...invoiceKeys.all, "list"] as const,
  list: (params: ListInvoicesParams = {}) =>
    [...invoiceKeys.lists(), params] as const,
  details: () => [...invoiceKeys.all, "detail"] as const,
  detail: (id: string) => [...invoiceKeys.details(), id] as const,
};

export function useInvoicesQuery(params: ListInvoicesParams | string = {}) {
  // Back-compat: customer panel passed customerId as a string.
  const normalized: ListInvoicesParams =
    typeof params === "string" ? { customerId: params, pageSize: 50 } : params;

  return useQuery({
    queryKey: invoiceKeys.list(normalized),
    queryFn: () =>
      listInvoices({
        pageSize: 50,
        ...normalized,
      }),
  });
}

export function useInvoiceQuery(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: invoiceKeys.detail(id ?? ""),
    queryFn: () => getInvoice(id!),
    enabled: Boolean(id) && enabled,
  });
}

function useInvoiceMutation<TData, TArg>(fn: (arg: TArg) => Promise<TData>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: invoiceKeys.all });
    },
  });
}

export const useCreateInvoiceMutation = () =>
  useInvoiceMutation((input: CreateInvoiceInput) => createInvoice(input));
export const useSendInvoiceMutation = () =>
  useInvoiceMutation((id: string) => sendInvoice(id));
export const useMarkInvoicePaidMutation = () =>
  useInvoiceMutation((id: string) => markInvoicePaid(id));
export const useDeleteInvoiceMutation = () =>
  useInvoiceMutation((id: string) => deleteInvoice(id));
export const useDownloadInvoiceMutation = () =>
  useInvoiceMutation((id: string) => downloadInvoice(id));
