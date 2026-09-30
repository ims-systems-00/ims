import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createBusinessPremise,
  deleteBusinessPremise,
  getBusinessPremise,
  listBusinessPremises,
  updateBusinessPremise,
} from "../api/business-premises";
import type {
  CreateBusinessPremiseInput,
  ListBusinessPremisesParams,
  UpdateBusinessPremiseInput,
} from "../types";

export const businessPremiseKeys = {
  all: ["business-premises"] as const,
  lists: () => [...businessPremiseKeys.all, "list"] as const,
  list: (params: ListBusinessPremisesParams) =>
    [...businessPremiseKeys.lists(), params] as const,
  details: () => [...businessPremiseKeys.all, "detail"] as const,
  detail: (id: string) => [...businessPremiseKeys.details(), id] as const,
};

export function useBusinessPremisesQuery(params: ListBusinessPremisesParams) {
  return useQuery({
    queryKey: businessPremiseKeys.list(params),
    queryFn: () => listBusinessPremises(params),
  });
}

export function useBusinessPremiseQuery(id: string | undefined) {
  return useQuery({
    queryKey: businessPremiseKeys.detail(id ?? ""),
    queryFn: () => getBusinessPremise(id!),
    enabled: Boolean(id),
  });
}

export function useCreateBusinessPremiseMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateBusinessPremiseInput) =>
      createBusinessPremise(body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: businessPremiseKeys.lists(),
      });
    },
  });
}

export function useUpdateBusinessPremiseMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateBusinessPremiseInput) =>
      updateBusinessPremise(id, body),
    onSuccess: async (premise) => {
      await queryClient.invalidateQueries({
        queryKey: businessPremiseKeys.lists(),
      });
      queryClient.setQueryData(businessPremiseKeys.detail(id), premise);
    },
  });
}

export function useDeleteBusinessPremiseMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBusinessPremise(id),
    onSuccess: async (_data, id) => {
      await queryClient.invalidateQueries({
        queryKey: businessPremiseKeys.lists(),
      });
      queryClient.removeQueries({
        queryKey: businessPremiseKeys.detail(id),
      });
    },
  });
}
