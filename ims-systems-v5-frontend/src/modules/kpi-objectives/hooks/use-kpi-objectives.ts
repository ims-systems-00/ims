import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createKpiObjective,
  deleteKpiObjective,
  listKpiObjectives,
  updateKpiObjective,
} from "../api/kpi-objectives";
import type {
  CreateKpiObjectiveInput,
  ListKpiObjectivesParams,
  UpdateKpiObjectiveInput,
} from "../types";

export const kpiObjectiveKeys = {
  all: ["kpi-objectives"] as const,
  lists: () => [...kpiObjectiveKeys.all, "list"] as const,
  list: (params: ListKpiObjectivesParams) =>
    [...kpiObjectiveKeys.lists(), params] as const,
};

async function invalidateKpiQueries(
  queryClient: ReturnType<typeof useQueryClient>
) {
  await queryClient.invalidateQueries({
    queryKey: kpiObjectiveKeys.lists(),
  });
}

export function useKpiObjectivesQuery(params: ListKpiObjectivesParams) {
  return useQuery({
    queryKey: kpiObjectiveKeys.list(params),
    queryFn: () => listKpiObjectives(params),
  });
}

export function useCreateKpiObjectiveMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateKpiObjectiveInput) => createKpiObjective(body),
    onSuccess: async () => {
      await invalidateKpiQueries(queryClient);
    },
  });
}

export function useUpdateKpiObjectiveMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: UpdateKpiObjectiveInput;
    }) => updateKpiObjective(id, body),
    onSuccess: async () => {
      await invalidateKpiQueries(queryClient);
    },
  });
}

export function useDeleteKpiObjectiveMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteKpiObjective(id),
    onSuccess: async () => {
      await invalidateKpiQueries(queryClient);
    },
  });
}
