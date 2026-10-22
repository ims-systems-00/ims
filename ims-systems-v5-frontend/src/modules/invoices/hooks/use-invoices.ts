import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createInvoice,
  deleteInvoice,
  downloadInvoice,
  listInvoices,
  markInvoicePaid,
  sendInvoice,
} from "../api/invoices";
import type { CreateInvoiceInput } from "../types";

export const invoiceKeys = {
  all: ["invoices"] as const,
  list: (customerId?: string) => ["invoices", "list", customerId ?? "all"] as const,
};

export function useInvoicesQuery(customerId?: string) {
  return useQuery({
    queryKey: invoiceKeys.list(customerId),
    queryFn: () => listInvoices({ customerId, pageSize: 50 }),
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
