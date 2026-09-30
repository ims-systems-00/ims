import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addFunctionalUnitMembers,
  createFunctionalUnit,
  deleteFunctionalUnit,
  getFunctionalUnit,
  listEligibleFunctionalUnitMembers,
  listFunctionalUnitMembers,
  listFunctionalUnits,
  removeFunctionalUnitMember,
  updateFunctionalUnit,
} from "../api/functional-units";
import type {
  CreateFunctionalUnitInput,
  ListFunctionalUnitsParams,
  UpdateFunctionalUnitInput,
} from "../types";

export const functionalUnitKeys = {
  all: ["functional-units"] as const,
  lists: () => [...functionalUnitKeys.all, "list"] as const,
  list: (params: ListFunctionalUnitsParams) =>
    [...functionalUnitKeys.lists(), params] as const,
  details: () => [...functionalUnitKeys.all, "detail"] as const,
  detail: (id: string) => [...functionalUnitKeys.details(), id] as const,
  members: (id: string) =>
    [...functionalUnitKeys.detail(id), "members"] as const,
  eligible: (id: string, search = "") =>
    [...functionalUnitKeys.detail(id), "eligible", search] as const,
};

export function useFunctionalUnitsQuery(params: ListFunctionalUnitsParams) {
  return useQuery({
    queryKey: functionalUnitKeys.list(params),
    queryFn: () => listFunctionalUnits(params),
  });
}

export function useFunctionalUnitQuery(id: string | undefined) {
  return useQuery({
    queryKey: functionalUnitKeys.detail(id ?? ""),
    queryFn: () => getFunctionalUnit(id!),
    enabled: Boolean(id),
  });
}

export function useFunctionalUnitMembersQuery(unitId: string | undefined) {
  return useQuery({
    queryKey: functionalUnitKeys.members(unitId ?? ""),
    queryFn: () => listFunctionalUnitMembers(unitId!),
    enabled: Boolean(unitId),
  });
}

export function useEligibleFunctionalUnitMembersQuery(
  unitId: string | undefined,
  search: string,
  enabled: boolean
) {
  return useQuery({
    queryKey: functionalUnitKeys.eligible(unitId ?? "", search),
    queryFn: () =>
      listEligibleFunctionalUnitMembers(unitId!, search || undefined),
    enabled: Boolean(unitId) && enabled,
  });
}

export function useCreateFunctionalUnitMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateFunctionalUnitInput) => createFunctionalUnit(body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: functionalUnitKeys.lists(),
      });
    },
  });
}

export function useUpdateFunctionalUnitMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateFunctionalUnitInput) =>
      updateFunctionalUnit(id, body),
    onSuccess: async (unit) => {
      await queryClient.invalidateQueries({
        queryKey: functionalUnitKeys.lists(),
      });
      queryClient.setQueryData(functionalUnitKeys.detail(id), unit);
    },
  });
}

export function useDeleteFunctionalUnitMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteFunctionalUnit(id),
    onSuccess: async (_data, id) => {
      await queryClient.invalidateQueries({
        queryKey: functionalUnitKeys.lists(),
      });
      queryClient.removeQueries({
        queryKey: functionalUnitKeys.detail(id),
      });
    },
  });
}

export function useAddFunctionalUnitMembersMutation(unitId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userIds: string[]) =>
      addFunctionalUnitMembers(unitId, userIds),
    onSuccess: async (data) => {
      queryClient.setQueryData(functionalUnitKeys.detail(unitId), data.unit);
      await queryClient.invalidateQueries({
        queryKey: functionalUnitKeys.members(unitId),
      });
      await queryClient.invalidateQueries({
        queryKey: [...functionalUnitKeys.detail(unitId), "eligible"],
      });
      await queryClient.invalidateQueries({
        queryKey: functionalUnitKeys.lists(),
      });
    },
  });
}

export function useRemoveFunctionalUnitMemberMutation(unitId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      removeFunctionalUnitMember(unitId, userId),
    onSuccess: async (data) => {
      queryClient.setQueryData(functionalUnitKeys.detail(unitId), data.unit);
      await queryClient.invalidateQueries({
        queryKey: functionalUnitKeys.members(unitId),
      });
      await queryClient.invalidateQueries({
        queryKey: [...functionalUnitKeys.detail(unitId), "eligible"],
      });
      await queryClient.invalidateQueries({
        queryKey: functionalUnitKeys.lists(),
      });
    },
  });
}
