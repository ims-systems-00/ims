import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  acceptRisk,
  createRisk,
  deleteRisk,
  downloadRisksReport,
  escalateRisk,
  getRisk,
  getRiskStats,
  listRisks,
  mitigateRisk,
  nudgeRisk,
  updateRisk,
} from "../api/risks";
import type {
  CreateRiskInput,
  ListRisksParams,
  UpdateRiskInput,
} from "../types";

export const riskKeys = {
  all: ["risks"] as const,
  lists: () => [...riskKeys.all, "list"] as const,
  list: (params: ListRisksParams) => [...riskKeys.lists(), params] as const,
  details: () => [...riskKeys.all, "detail"] as const,
  detail: (id: string) => [...riskKeys.details(), id] as const,
  stats: () => [...riskKeys.all, "stats"] as const,
};

async function invalidateRiskQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  id?: string
) {
  await queryClient.invalidateQueries({ queryKey: riskKeys.lists() });
  await queryClient.invalidateQueries({ queryKey: riskKeys.stats() });
  if (id) {
    await queryClient.invalidateQueries({ queryKey: riskKeys.detail(id) });
  }
}

export function useRisksQuery(params: ListRisksParams) {
  return useQuery({
    queryKey: riskKeys.list(params),
    queryFn: () => listRisks(params),
  });
}

export function useRiskQuery(id: string | undefined) {
  return useQuery({
    queryKey: riskKeys.detail(id ?? ""),
    queryFn: () => getRisk(id!),
    enabled: Boolean(id),
  });
}

export function useRiskStatsQuery() {
  return useQuery({
    queryKey: riskKeys.stats(),
    queryFn: () => getRiskStats(),
  });
}

export function useCreateRiskMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateRiskInput) => createRisk(body),
    onSuccess: async () => {
      await invalidateRiskQueries(queryClient);
    },
  });
}

export function useUpdateRiskMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateRiskInput) => updateRisk(id, body),
    onSuccess: async (risk) => {
      await invalidateRiskQueries(queryClient, id);
      queryClient.setQueryData(riskKeys.detail(id), risk);
    },
  });
}

export function useDeleteRiskMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRisk(id),
    onSuccess: async (_data, id) => {
      await invalidateRiskQueries(queryClient);
      queryClient.removeQueries({ queryKey: riskKeys.detail(id) });
    },
  });
}

export function useEscalateRiskMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => escalateRisk(id),
    onSuccess: async (risk) => {
      await invalidateRiskQueries(queryClient, risk.id);
      queryClient.setQueryData(riskKeys.detail(risk.id), risk);
    },
  });
}

export function useNudgeRiskMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => nudgeRisk(id),
    onSuccess: async (risk) => {
      await invalidateRiskQueries(queryClient, risk.id);
      queryClient.setQueryData(riskKeys.detail(risk.id), risk);
    },
  });
}

export function useMitigateRiskMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      mitigationText,
    }: {
      id: string;
      mitigationText: string;
    }) => mitigateRisk(id, { mitigationText }),
    onSuccess: async (risk) => {
      await invalidateRiskQueries(queryClient, risk.id);
      queryClient.setQueryData(riskKeys.detail(risk.id), risk);
    },
  });
}

export function useAcceptRiskMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      acceptanceRationale,
      decisionMaker,
    }: {
      id: string;
      acceptanceRationale: string;
      decisionMaker?: string;
    }) => acceptRisk(id, { acceptanceRationale, decisionMaker }),
    onSuccess: async (risk) => {
      await invalidateRiskQueries(queryClient, risk.id);
      queryClient.setQueryData(riskKeys.detail(risk.id), risk);
    },
  });
}

export function useDownloadRisksReportMutation() {
  return useMutation({
    mutationFn: () => downloadRisksReport(),
  });
}
