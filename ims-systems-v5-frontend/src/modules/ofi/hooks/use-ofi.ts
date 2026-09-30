import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addOfiActivity,
  createOfi,
  deleteOfi,
  getOfi,
  getOfiStats,
  implementOfi,
  listOfis,
  nudgeOfi,
  removeOfiAttachment,
  setOfiComplianceLinks,
  updateOfi,
} from "../api/ofi";
import type {
  CreateOfiInput,
  ListOfisParams,
  UpdateOfiInput,
} from "../types";

export const ofiKeys = {
  all: ["ofi"] as const,
  lists: () => [...ofiKeys.all, "list"] as const,
  list: (params: ListOfisParams) => [...ofiKeys.lists(), params] as const,
  details: () => [...ofiKeys.all, "detail"] as const,
  detail: (id: string) => [...ofiKeys.details(), id] as const,
  stats: () => [...ofiKeys.all, "stats"] as const,
};

async function invalidateOfiQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  id?: string
) {
  await queryClient.invalidateQueries({ queryKey: ofiKeys.lists() });
  await queryClient.invalidateQueries({ queryKey: ofiKeys.stats() });
  if (id) {
    await queryClient.invalidateQueries({ queryKey: ofiKeys.detail(id) });
  }
}

export function useOfisQuery(params: ListOfisParams) {
  return useQuery({
    queryKey: ofiKeys.list(params),
    queryFn: () => listOfis(params),
  });
}

export function useOfiQuery(id: string | undefined) {
  return useQuery({
    queryKey: ofiKeys.detail(id ?? ""),
    queryFn: () => getOfi(id!),
    enabled: Boolean(id),
  });
}

export function useOfiStatsQuery() {
  return useQuery({
    queryKey: ofiKeys.stats(),
    queryFn: () => getOfiStats(),
  });
}

export function useCreateOfiMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateOfiInput) => createOfi(body),
    onSuccess: async () => {
      await invalidateOfiQueries(queryClient);
    },
  });
}

export function useUpdateOfiMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateOfiInput) => updateOfi(id, body),
    onSuccess: async (ofi) => {
      await invalidateOfiQueries(queryClient, id);
      queryClient.setQueryData(ofiKeys.detail(id), ofi);
    },
  });
}

export function useDeleteOfiMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteOfi(id),
    onSuccess: async (_data, id) => {
      await invalidateOfiQueries(queryClient);
      queryClient.removeQueries({ queryKey: ofiKeys.detail(id) });
    },
  });
}

function useOfiLifecycleMutation(
  mutationFn: (id: string) => Promise<import("../types").Ofi>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async (ofi) => {
      await invalidateOfiQueries(queryClient, ofi.id);
      queryClient.setQueryData(ofiKeys.detail(ofi.id), ofi);
    },
  });
}

export function useImplementOfiMutation() {
  return useOfiLifecycleMutation(implementOfi);
}

export function useNudgeOfiMutation() {
  return useOfiLifecycleMutation(nudgeOfi);
}

export function useAddOfiActivityMutation(ofiId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (message: string) => addOfiActivity(ofiId, { message }),
    onSuccess: async (ofi) => {
      await invalidateOfiQueries(queryClient, ofiId);
      queryClient.setQueryData(ofiKeys.detail(ofiId), ofi);
    },
  });
}

export function useRemoveOfiAttachmentMutation(ofiId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: string) =>
      removeOfiAttachment(ofiId, attachmentId),
    onSuccess: async (ofi) => {
      await invalidateOfiQueries(queryClient, ofiId);
      queryClient.setQueryData(ofiKeys.detail(ofiId), ofi);
    },
  });
}

export function useSetOfiComplianceLinksMutation(ofiId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (links: Array<{ toolkitId: string; clauseIds: string[] }>) =>
      setOfiComplianceLinks(ofiId, { links }),
    onSuccess: async (ofi) => {
      await invalidateOfiQueries(queryClient, ofiId);
      queryClient.setQueryData(ofiKeys.detail(ofiId), ofi);
    },
  });
}
