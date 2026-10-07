import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addEmbeddedEvidence,
  createControlEvidence,
  getComplianceControl,
  getComplianceOverview,
  listCatalogueControls,
  listComplianceControls,
  listComplianceToolkits,
  listControlEvidence,
  provisionComplianceToolkit,
  removeControlEvidence,
  removeEmbeddedEvidence,
  updateComplianceControlStatus,
} from "../api/compliance";
import type {
  AddEmbeddedEvidenceInput,
  ComplianceToolkitName,
  CreateControlEvidenceInput,
  ListCatalogueControlsParams,
  ListControlEvidenceParams,
  ListControlsParams,
  UpdateControlStatusInput,
} from "../types";

export const complianceKeys = {
  all: ["compliance"] as const,
  toolkits: () => [...complianceKeys.all, "toolkits"] as const,
  overview: (name: string) =>
    [...complianceKeys.all, "overview", name] as const,
  controls: (name: string, params: ListControlsParams) =>
    [...complianceKeys.all, "controls", name, params] as const,
  catalogue: (name: string, params: ListCatalogueControlsParams) =>
    [...complianceKeys.all, "catalogue", name, params] as const,
  control: (id: string) => [...complianceKeys.all, "control", id] as const,
  evidence: (id: string, params: ListControlEvidenceParams) =>
    [...complianceKeys.all, "evidence", id, params] as const,
};

async function invalidateToolkitQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  name?: string,
  controlId?: string
) {
  await queryClient.invalidateQueries({ queryKey: complianceKeys.toolkits() });
  if (name) {
    await queryClient.invalidateQueries({
      queryKey: [...complianceKeys.all, "overview", name],
    });
    await queryClient.invalidateQueries({
      queryKey: [...complianceKeys.all, "controls", name],
    });
  } else {
    await queryClient.invalidateQueries({
      queryKey: [...complianceKeys.all, "overview"],
    });
    await queryClient.invalidateQueries({
      queryKey: [...complianceKeys.all, "controls"],
    });
  }
  if (controlId) {
    await queryClient.invalidateQueries({
      queryKey: complianceKeys.control(controlId),
    });
    await queryClient.invalidateQueries({
      queryKey: [...complianceKeys.all, "evidence", controlId],
    });
  }
}

export function useComplianceToolkitsQuery() {
  return useQuery({
    queryKey: complianceKeys.toolkits(),
    queryFn: () => listComplianceToolkits(),
  });
}

export function useComplianceOverviewQuery(name: string | undefined) {
  return useQuery({
    queryKey: complianceKeys.overview(name ?? ""),
    queryFn: () => getComplianceOverview(name!),
    enabled: Boolean(name),
  });
}

export function useComplianceControlsQuery(
  name: string | undefined,
  params: ListControlsParams
) {
  return useQuery({
    queryKey: complianceKeys.controls(name ?? "", params),
    queryFn: () => listComplianceControls(name!, params),
    enabled: Boolean(name),
  });
}

export function useCatalogueControlsQuery(
  name: string | undefined,
  params: ListCatalogueControlsParams,
  enabled = true
) {
  return useQuery({
    queryKey: complianceKeys.catalogue(name ?? "", params),
    queryFn: () => listCatalogueControls(name!, params),
    enabled: Boolean(name) && enabled,
  });
}

export function useComplianceControlQuery(id: string | undefined) {
  return useQuery({
    queryKey: complianceKeys.control(id ?? ""),
    queryFn: () => getComplianceControl(id!),
    enabled: Boolean(id),
  });
}

export function useControlEvidenceQuery(
  controlStatusId: string | undefined,
  params: ListControlEvidenceParams = { page: 1, pageSize: 50 }
) {
  return useQuery({
    queryKey: complianceKeys.evidence(controlStatusId ?? "", params),
    queryFn: () => listControlEvidence(controlStatusId!, params),
    enabled: Boolean(controlStatusId),
  });
}

export function useProvisionToolkitMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: ComplianceToolkitName) =>
      provisionComplianceToolkit(name),
    onSuccess: async (result) => {
      await invalidateToolkitQueries(queryClient, result.name);
    },
  });
}

export function useUpdateControlStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: UpdateControlStatusInput;
    }) => updateComplianceControlStatus(id, body),
    onSuccess: async (control) => {
      await invalidateToolkitQueries(queryClient, control.name, control.id);
    },
  });
}

export function useCreateControlEvidenceMutation(controlStatusId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateControlEvidenceInput) =>
      createControlEvidence(controlStatusId, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [...complianceKeys.all, "evidence", controlStatusId],
      });
      await queryClient.invalidateQueries({
        queryKey: complianceKeys.control(controlStatusId),
      });
    },
  });
}

export function useRemoveControlEvidenceMutation(controlStatusId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (evidenceId: string) =>
      removeControlEvidence(controlStatusId, evidenceId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [...complianceKeys.all, "evidence", controlStatusId],
      });
    },
  });
}

export function useAddEmbeddedEvidenceMutation(controlStatusId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: AddEmbeddedEvidenceInput) =>
      addEmbeddedEvidence(controlStatusId, body),
    onSuccess: async (control) => {
      await invalidateToolkitQueries(queryClient, control.name, control.id);
    },
  });
}

export function useRemoveEmbeddedEvidenceMutation(controlStatusId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: string) =>
      removeEmbeddedEvidence(controlStatusId, attachmentId),
    onSuccess: async (control) => {
      await invalidateToolkitQueries(queryClient, control.name, control.id);
    },
  });
}
