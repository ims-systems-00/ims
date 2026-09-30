import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createIncident,
  deleteIncident,
  downloadIncidentsReport,
  escalateIncident,
  getIncident,
  getIncidentStats,
  listIncidents,
  nudgeIncident,
  removeIncidentAttachment,
  resolveIncident,
  setIncidentComplianceLinks,
  updateIncident,
} from "../api/incidents";
import type {
  CreateIncidentInput,
  ListIncidentsParams,
  UpdateIncidentInput,
} from "../types";

export const incidentKeys = {
  all: ["incidents"] as const,
  lists: () => [...incidentKeys.all, "list"] as const,
  list: (params: ListIncidentsParams) =>
    [...incidentKeys.lists(), params] as const,
  details: () => [...incidentKeys.all, "detail"] as const,
  detail: (id: string) => [...incidentKeys.details(), id] as const,
  stats: () => [...incidentKeys.all, "stats"] as const,
};

async function invalidateIncidentQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  id?: string
) {
  await queryClient.invalidateQueries({ queryKey: incidentKeys.lists() });
  await queryClient.invalidateQueries({ queryKey: incidentKeys.stats() });
  if (id) {
    await queryClient.invalidateQueries({ queryKey: incidentKeys.detail(id) });
  }
}

export function useIncidentsQuery(params: ListIncidentsParams) {
  return useQuery({
    queryKey: incidentKeys.list(params),
    queryFn: () => listIncidents(params),
  });
}

export function useIncidentQuery(id: string | undefined) {
  return useQuery({
    queryKey: incidentKeys.detail(id ?? ""),
    queryFn: () => getIncident(id!),
    enabled: Boolean(id),
  });
}

export function useIncidentStatsQuery() {
  return useQuery({
    queryKey: incidentKeys.stats(),
    queryFn: () => getIncidentStats(),
  });
}

export function useCreateIncidentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateIncidentInput) => createIncident(body),
    onSuccess: async () => {
      await invalidateIncidentQueries(queryClient);
    },
  });
}

export function useUpdateIncidentMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateIncidentInput) => updateIncident(id, body),
    onSuccess: async (incident) => {
      await invalidateIncidentQueries(queryClient, id);
      queryClient.setQueryData(incidentKeys.detail(id), incident);
    },
  });
}

export function useDeleteIncidentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteIncident(id),
    onSuccess: async (_data, id) => {
      await invalidateIncidentQueries(queryClient);
      queryClient.removeQueries({ queryKey: incidentKeys.detail(id) });
    },
  });
}

function useIncidentLifecycleMutation(
  mutationFn: (id: string) => Promise<import("../types").Incident>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async (incident) => {
      await invalidateIncidentQueries(queryClient, incident.id);
      queryClient.setQueryData(incidentKeys.detail(incident.id), incident);
    },
  });
}

export function useEscalateIncidentMutation() {
  return useIncidentLifecycleMutation(escalateIncident);
}

export function useNudgeIncidentMutation() {
  return useIncidentLifecycleMutation(nudgeIncident);
}

export function useResolveIncidentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      resolution,
    }: {
      id: string;
      resolution: string;
    }) => resolveIncident(id, { resolution }),
    onSuccess: async (incident) => {
      await invalidateIncidentQueries(queryClient, incident.id);
      queryClient.setQueryData(incidentKeys.detail(incident.id), incident);
    },
  });
}

export function useRemoveIncidentAttachmentMutation(incidentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: string) =>
      removeIncidentAttachment(incidentId, attachmentId),
    onSuccess: async (incident) => {
      await invalidateIncidentQueries(queryClient, incidentId);
      queryClient.setQueryData(incidentKeys.detail(incidentId), incident);
    },
  });
}

export function useSetIncidentComplianceLinksMutation(incidentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (links: Array<{ toolkitId: string; clauseIds: string[] }>) =>
      setIncidentComplianceLinks(incidentId, { links }),
    onSuccess: async (incident) => {
      await invalidateIncidentQueries(queryClient, incidentId);
      queryClient.setQueryData(incidentKeys.detail(incidentId), incident);
    },
  });
}

export function useDownloadIncidentsReportMutation() {
  return useMutation({
    mutationFn: () => downloadIncidentsReport(),
  });
}
