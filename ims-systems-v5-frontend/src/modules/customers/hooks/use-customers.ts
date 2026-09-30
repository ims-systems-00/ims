import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCustomer,
  deleteCustomer,
  getAccountManagerOverview,
  getCustomer,
  getCustomerOverview,
  listCustomers,
  removeCustomerAttachment,
  updateCustomer,
} from "../api/customers";
import type {
  CreateCustomerInput,
  ListCustomersParams,
  UpdateCustomerInput,
} from "../types";

export const customerKeys = {
  all: ["customers"] as const,
  lists: () => [...customerKeys.all, "list"] as const,
  list: (params: ListCustomersParams) =>
    [...customerKeys.lists(), params] as const,
  details: () => [...customerKeys.all, "detail"] as const,
  detail: (id: string) => [...customerKeys.details(), id] as const,
  overviews: () => [...customerKeys.all, "overview"] as const,
  overview: (id: string) => [...customerKeys.overviews(), id] as const,
  managerOverviews: () => [...customerKeys.all, "manager-overview"] as const,
  managerOverview: (managerId: string) =>
    [...customerKeys.managerOverviews(), managerId] as const,
};

async function invalidateCustomerQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  id?: string
) {
  await queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
  await queryClient.invalidateQueries({
    queryKey: customerKeys.managerOverviews(),
  });
  if (id) {
    await queryClient.invalidateQueries({
      queryKey: customerKeys.detail(id),
    });
    await queryClient.invalidateQueries({
      queryKey: customerKeys.overview(id),
    });
  }
}

export function useCustomersQuery(params: ListCustomersParams) {
  return useQuery({
    queryKey: customerKeys.list(params),
    queryFn: () => listCustomers(params),
  });
}

export function useCustomerQuery(id: string | undefined) {
  return useQuery({
    queryKey: customerKeys.detail(id ?? ""),
    queryFn: () => getCustomer(id!),
    enabled: Boolean(id),
  });
}

export function useCustomerOverviewQuery(
  id: string | undefined,
  enabled = true
) {
  return useQuery({
    queryKey: customerKeys.overview(id ?? ""),
    queryFn: () => getCustomerOverview(id!),
    enabled: Boolean(id) && enabled,
  });
}

export function useAccountManagerOverviewQuery(
  managerId: string | undefined
) {
  return useQuery({
    queryKey: customerKeys.managerOverview(managerId ?? ""),
    queryFn: () => getAccountManagerOverview(managerId!),
    enabled: Boolean(managerId),
  });
}

export function useCreateCustomerMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateCustomerInput) => createCustomer(body),
    onSuccess: async () => {
      await invalidateCustomerQueries(queryClient);
    },
  });
}

export function useUpdateCustomerMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateCustomerInput) => updateCustomer(id, body),
    onSuccess: async (customer) => {
      await invalidateCustomerQueries(queryClient, id);
      queryClient.setQueryData(customerKeys.detail(id), customer);
    },
  });
}

export function useDeleteCustomerMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCustomer(id),
    onSuccess: async (_data, id) => {
      await invalidateCustomerQueries(queryClient);
      queryClient.removeQueries({ queryKey: customerKeys.detail(id) });
      queryClient.removeQueries({ queryKey: customerKeys.overview(id) });
    },
  });
}

export function useRemoveCustomerAttachmentMutation(customerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: string) =>
      removeCustomerAttachment(customerId, attachmentId),
    onSuccess: async (customer) => {
      await invalidateCustomerQueries(queryClient, customerId);
      queryClient.setQueryData(customerKeys.detail(customerId), customer);
    },
  });
}
