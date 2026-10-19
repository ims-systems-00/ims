import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  closeEmailCampaign,
  createAndLaunchEmailCampaign,
  createEmailCampaign,
  deleteEmailCampaign,
  getCampaignOverview,
  getEmailCampaign,
  launchEmailCampaign,
  listCampaignDeliveries,
  listEmailCampaigns,
  updateEmailCampaign,
} from "../api/email-campaigns";
import type {
  CreateEmailCampaignInput,
  ListEmailCampaignsParams,
  UpdateEmailCampaignInput,
} from "../types";

export const emailCampaignKeys = {
  all: ["email-campaigns"] as const,
  lists: () => [...emailCampaignKeys.all, "list"] as const,
  list: (params: ListEmailCampaignsParams) =>
    [...emailCampaignKeys.lists(), params] as const,
  details: () => [...emailCampaignKeys.all, "detail"] as const,
  detail: (id: string) => [...emailCampaignKeys.details(), id] as const,
  overviews: () => [...emailCampaignKeys.all, "overview"] as const,
  overview: (id: string) => [...emailCampaignKeys.overviews(), id] as const,
  deliveries: () => [...emailCampaignKeys.all, "deliveries"] as const,
  delivery: (id: string, page: number) =>
    [...emailCampaignKeys.deliveries(), id, page] as const,
};

async function invalidateCampaignQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  id?: string
) {
  await queryClient.invalidateQueries({ queryKey: emailCampaignKeys.lists() });
  if (id) {
    await queryClient.invalidateQueries({
      queryKey: emailCampaignKeys.detail(id),
    });
    await queryClient.invalidateQueries({
      queryKey: emailCampaignKeys.overviews(),
    });
    await queryClient.invalidateQueries({
      queryKey: emailCampaignKeys.deliveries(),
    });
  }
}

export function useEmailCampaignsQuery(params: ListEmailCampaignsParams) {
  return useQuery({
    queryKey: emailCampaignKeys.list(params),
    queryFn: () => listEmailCampaigns(params),
  });
}

export function useEmailCampaignQuery(id: string | undefined) {
  return useQuery({
    queryKey: emailCampaignKeys.detail(id ?? ""),
    queryFn: () => getEmailCampaign(id!),
    enabled: Boolean(id),
  });
}

export function useCampaignOverviewQuery(
  id: string | undefined,
  enabled = true
) {
  return useQuery({
    queryKey: emailCampaignKeys.overview(id ?? ""),
    queryFn: () => getCampaignOverview(id!),
    enabled: Boolean(id) && enabled,
  });
}

export function useCampaignDeliveriesQuery(
  id: string | undefined,
  page = 1,
  enabled = true
) {
  return useQuery({
    queryKey: emailCampaignKeys.delivery(id ?? "", page),
    queryFn: () =>
      listCampaignDeliveries(id!, { page, pageSize: 10 }),
    enabled: Boolean(id) && enabled,
  });
}

export function useCreateEmailCampaignMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateEmailCampaignInput) => createEmailCampaign(body),
    onSuccess: async () => {
      await invalidateCampaignQueries(queryClient);
    },
  });
}

export function useCreateAndLaunchEmailCampaignMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateEmailCampaignInput) =>
      createAndLaunchEmailCampaign(body),
    onSuccess: async (data) => {
      await invalidateCampaignQueries(queryClient, data.id);
    },
  });
}

export function useUpdateEmailCampaignMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateEmailCampaignInput) =>
      updateEmailCampaign(id, body),
    onSuccess: async () => {
      await invalidateCampaignQueries(queryClient, id);
    },
  });
}

export function useDeleteEmailCampaignMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteEmailCampaign(id),
    onSuccess: async (_data, id) => {
      await invalidateCampaignQueries(queryClient, id);
    },
  });
}

export function useLaunchEmailCampaignMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => launchEmailCampaign(id),
    onSuccess: async (data) => {
      await invalidateCampaignQueries(queryClient, data.id);
    },
  });
}

export function useCloseEmailCampaignMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => closeEmailCampaign(id),
    onSuccess: async (data) => {
      await invalidateCampaignQueries(queryClient, data.id);
    },
  });
}
