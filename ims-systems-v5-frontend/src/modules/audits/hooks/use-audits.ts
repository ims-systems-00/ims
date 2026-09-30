import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addEmbeddedRisk,
  addIdentification,
  addOfi,
  completeAudit,
  createAudit,
  deleteAudit,
  extractAuditReport,
  getAudit,
  getAuditStats,
  listAudits,
  removeAuditAttachment,
  removeEmbeddedRisk,
  removeIdentification,
  removeOfi,
  setAuditComplianceLinks,
  updateAudit,
  updateEmbeddedRisk,
  updateIdentification,
  updateOfi,
} from "../api/audits";
import type {
  CreateAuditInput,
  CreateEmbeddedRiskInput,
  CreateIdentificationInput,
  CreateOfiInput,
  ExtractReportInput,
  ListAuditsParams,
  UpdateAuditInput,
  UpdateEmbeddedRiskInput,
  UpdateIdentificationInput,
  UpdateOfiInput,
} from "../types";

export const auditKeys = {
  all: ["audits"] as const,
  lists: () => [...auditKeys.all, "list"] as const,
  list: (params: ListAuditsParams) => [...auditKeys.lists(), params] as const,
  details: () => [...auditKeys.all, "detail"] as const,
  detail: (id: string) => [...auditKeys.details(), id] as const,
  stats: (type?: string) => [...auditKeys.all, "stats", type ?? "all"] as const,
};

async function invalidateAuditQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  id?: string
) {
  await queryClient.invalidateQueries({ queryKey: auditKeys.lists() });
  await queryClient.invalidateQueries({ queryKey: [...auditKeys.all, "stats"] });
  if (id) {
    await queryClient.invalidateQueries({ queryKey: auditKeys.detail(id) });
  }
}

export function useAuditsQuery(params: ListAuditsParams) {
  return useQuery({
    queryKey: auditKeys.list(params),
    queryFn: () => listAudits(params),
  });
}

export function useAuditQuery(id: string | undefined) {
  return useQuery({
    queryKey: auditKeys.detail(id ?? ""),
    queryFn: () => getAudit(id!),
    enabled: Boolean(id),
  });
}

export function useAuditStatsQuery(type?: string) {
  return useQuery({
    queryKey: auditKeys.stats(type),
    queryFn: () => getAuditStats(type),
  });
}

export function useCreateAuditMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateAuditInput) => createAudit(body),
    onSuccess: async () => {
      await invalidateAuditQueries(queryClient);
    },
  });
}

export function useUpdateAuditMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateAuditInput) => updateAudit(id, body),
    onSuccess: async (audit) => {
      await invalidateAuditQueries(queryClient, id);
      queryClient.setQueryData(auditKeys.detail(id), audit);
    },
  });
}

export function useDeleteAuditMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAudit(id),
    onSuccess: async (_data, id) => {
      await invalidateAuditQueries(queryClient);
      queryClient.removeQueries({ queryKey: auditKeys.detail(id) });
    },
  });
}

export function useCompleteAuditMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => completeAudit(id),
    onSuccess: async (audit) => {
      await invalidateAuditQueries(queryClient, audit.id);
      queryClient.setQueryData(auditKeys.detail(audit.id), audit);
      // Promoted incidents/risks may appear — invalidate related lists.
      await queryClient.invalidateQueries({ queryKey: ["incidents"] });
      await queryClient.invalidateQueries({ queryKey: ["risks"] });
    },
  });
}

export function useIdentificationMutations(auditId: string) {
  const queryClient = useQueryClient();
  const invalidate = async (audit: import("../types").Audit) => {
    await invalidateAuditQueries(queryClient, auditId);
    queryClient.setQueryData(auditKeys.detail(auditId), audit);
  };

  return {
    add: useMutation({
      mutationFn: (body: CreateIdentificationInput) =>
        addIdentification(auditId, body),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({
        identificationId,
        body,
      }: {
        identificationId: string;
        body: UpdateIdentificationInput;
      }) => updateIdentification(auditId, identificationId, body),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (identificationId: string) =>
        removeIdentification(auditId, identificationId),
      onSuccess: invalidate,
    }),
  };
}

export function useEmbeddedRiskMutations(auditId: string) {
  const queryClient = useQueryClient();
  const invalidate = async (audit: import("../types").Audit) => {
    await invalidateAuditQueries(queryClient, auditId);
    queryClient.setQueryData(auditKeys.detail(auditId), audit);
  };

  return {
    add: useMutation({
      mutationFn: (body: CreateEmbeddedRiskInput) =>
        addEmbeddedRisk(auditId, body),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({
        riskId,
        body,
      }: {
        riskId: string;
        body: UpdateEmbeddedRiskInput;
      }) => updateEmbeddedRisk(auditId, riskId, body),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (riskId: string) => removeEmbeddedRisk(auditId, riskId),
      onSuccess: invalidate,
    }),
  };
}

export function useOfiMutations(auditId: string) {
  const queryClient = useQueryClient();
  const invalidate = async (audit: import("../types").Audit) => {
    await invalidateAuditQueries(queryClient, auditId);
    queryClient.setQueryData(auditKeys.detail(auditId), audit);
  };

  return {
    add: useMutation({
      mutationFn: (body: CreateOfiInput) => addOfi(auditId, body),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({
        ofiId,
        body,
      }: {
        ofiId: string;
        body: UpdateOfiInput;
      }) => updateOfi(auditId, ofiId, body),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (ofiId: string) => removeOfi(auditId, ofiId),
      onSuccess: invalidate,
    }),
  };
}

export function useRemoveAuditAttachmentMutation(auditId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: string) =>
      removeAuditAttachment(auditId, attachmentId),
    onSuccess: async (audit) => {
      await invalidateAuditQueries(queryClient, auditId);
      queryClient.setQueryData(auditKeys.detail(auditId), audit);
    },
  });
}

export function useSetAuditComplianceLinksMutation(auditId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (links: Array<{ toolkitId: string; clauseIds: string[] }>) =>
      setAuditComplianceLinks(auditId, { links }),
    onSuccess: async (audit) => {
      await invalidateAuditQueries(queryClient, auditId);
      queryClient.setQueryData(auditKeys.detail(auditId), audit);
    },
  });
}

export function useExtractAuditReportMutation(auditId: string) {
  return useMutation({
    mutationFn: (body: ExtractReportInput) =>
      extractAuditReport(auditId, body),
  });
}
