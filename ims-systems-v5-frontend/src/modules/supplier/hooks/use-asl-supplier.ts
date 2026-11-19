import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addAslDocument,
  addAslEvaluation,
  createAslSupplier,
  deleteAslDocument,
  getAslOverview,
  getAslPublicSnapshot,
  getAslSettings,
  getAslSupplier,
  getAslUploadContext,
  listAslSuppliers,
  notifyAslSuppliers,
  publicAslUpload,
  shareAslPack,
  updateAslDocument,
  updateAslSettings,
  updateAslSupplier,
} from "../api/asl-supplier";
import type {
  CreateAslEvaluationInput,
  CreateAslSupplierInput,
  ListAslSuppliersParams,
  PublicAslUploadInput,
  UpdateAslSettingsInput,
  UpdateAslSupplierInput,
  UpsertAslDocumentInput,
} from "../types";

export const aslKeys = {
  all: ["asl-supplier"] as const,
  lists: () => [...aslKeys.all, "list"] as const,
  list: (params: ListAslSuppliersParams) =>
    [...aslKeys.lists(), params] as const,
  details: () => [...aslKeys.all, "detail"] as const,
  detail: (id: string) => [...aslKeys.details(), id] as const,
  overview: () => [...aslKeys.all, "overview"] as const,
  settings: () => [...aslKeys.all, "settings"] as const,
  publicSnapshot: (token: string) =>
    [...aslKeys.all, "public", token] as const,
  uploadContext: (token: string) =>
    [...aslKeys.all, "upload", token] as const,
};

async function invalidateAsl(
  queryClient: ReturnType<typeof useQueryClient>,
  id?: string
) {
  await queryClient.invalidateQueries({ queryKey: aslKeys.lists() });
  await queryClient.invalidateQueries({ queryKey: aslKeys.overview() });
  await queryClient.invalidateQueries({ queryKey: aslKeys.settings() });
  if (id) {
    await queryClient.invalidateQueries({ queryKey: aslKeys.detail(id) });
  }
}

export function useAslSuppliersQuery(params: ListAslSuppliersParams) {
  return useQuery({
    queryKey: aslKeys.list(params),
    queryFn: () => listAslSuppliers(params),
  });
}

export function useAslSupplierQuery(id: string | undefined) {
  return useQuery({
    queryKey: aslKeys.detail(id ?? ""),
    queryFn: () => getAslSupplier(id!),
    enabled: Boolean(id),
  });
}

export function useAslOverviewQuery() {
  return useQuery({
    queryKey: aslKeys.overview(),
    queryFn: () => getAslOverview(),
  });
}

export function useAslSettingsQuery() {
  return useQuery({
    queryKey: aslKeys.settings(),
    queryFn: () => getAslSettings(),
  });
}

export function useCreateAslSupplierMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateAslSupplierInput) => createAslSupplier(body),
    onSuccess: async () => {
      await invalidateAsl(queryClient);
    },
  });
}

export function useUpdateAslSupplierMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateAslSupplierInput) => updateAslSupplier(id, body),
    onSuccess: async (supplier) => {
      await invalidateAsl(queryClient, id);
      queryClient.setQueryData(aslKeys.detail(id), supplier);
    },
  });
}

export function useAddAslDocumentMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpsertAslDocumentInput) => addAslDocument(id, body),
    onSuccess: async (supplier) => {
      await invalidateAsl(queryClient, id);
      queryClient.setQueryData(aslKeys.detail(id), supplier);
    },
  });
}

export function useUpdateAslDocumentMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      docId,
      body,
    }: {
      docId: string;
      body: UpsertAslDocumentInput;
    }) => updateAslDocument(id, docId, body),
    onSuccess: async (supplier) => {
      await invalidateAsl(queryClient, id);
      queryClient.setQueryData(aslKeys.detail(id), supplier);
    },
  });
}

export function useDeleteAslDocumentMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (docId: string) => deleteAslDocument(id, docId),
    onSuccess: async (supplier) => {
      await invalidateAsl(queryClient, id);
      queryClient.setQueryData(aslKeys.detail(id), supplier);
    },
  });
}

export function useAddAslEvaluationMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateAslEvaluationInput) => addAslEvaluation(id, body),
    onSuccess: async (supplier) => {
      await invalidateAsl(queryClient, id);
      queryClient.setQueryData(aslKeys.detail(id), supplier);
    },
  });
}

export function useNotifyAslMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => notifyAslSuppliers(ids),
    onSuccess: async () => {
      await invalidateAsl(queryClient);
    },
  });
}

export function useUpdateAslSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateAslSettingsInput) => updateAslSettings(body),
    onSuccess: async (settings) => {
      queryClient.setQueryData(aslKeys.settings(), settings);
      await queryClient.invalidateQueries({ queryKey: aslKeys.overview() });
    },
  });
}

export function useShareAslMutation() {
  return useMutation({
    mutationFn: (expiresInDays?: number) => shareAslPack(expiresInDays ?? 30),
  });
}

export function useAslPublicSnapshotQuery(token: string | undefined) {
  return useQuery({
    queryKey: aslKeys.publicSnapshot(token ?? ""),
    queryFn: () => getAslPublicSnapshot(token!),
    enabled: Boolean(token),
    retry: false,
  });
}

export function useAslUploadContextQuery(token: string | undefined) {
  return useQuery({
    queryKey: aslKeys.uploadContext(token ?? ""),
    queryFn: () => getAslUploadContext(token!),
    enabled: Boolean(token),
    retry: false,
  });
}

export function usePublicAslUploadMutation(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: PublicAslUploadInput) => publicAslUpload(token, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: aslKeys.uploadContext(token),
      });
    },
  });
}
