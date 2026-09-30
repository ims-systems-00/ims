import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addSupplierContractFiles,
  addSupplierKpiObjective,
  addSupplierOnboardingFiles,
  addSupplierSlaFiles,
  createSupplier,
  deleteSupplier,
  getSupplier,
  getSupplierStats,
  listSuppliers,
  removeSupplierContractFile,
  removeSupplierKpiObjective,
  removeSupplierOnboardingFile,
  removeSupplierSlaFile,
  updateSupplier,
} from "../api/suppliers";
import type {
  AttachmentInput,
  CreateSupplierInput,
  ListSuppliersParams,
  UpdateSupplierInput,
} from "../types";

export const supplierKeys = {
  all: ["suppliers"] as const,
  lists: () => [...supplierKeys.all, "list"] as const,
  list: (params: ListSuppliersParams) =>
    [...supplierKeys.lists(), params] as const,
  details: () => [...supplierKeys.all, "detail"] as const,
  detail: (id: string) => [...supplierKeys.details(), id] as const,
  stats: () => [...supplierKeys.all, "stats"] as const,
};

async function invalidateSupplierQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  id?: string
) {
  await queryClient.invalidateQueries({ queryKey: supplierKeys.lists() });
  await queryClient.invalidateQueries({ queryKey: supplierKeys.stats() });
  if (id) {
    await queryClient.invalidateQueries({
      queryKey: supplierKeys.detail(id),
    });
  }
}

export function useSuppliersQuery(params: ListSuppliersParams) {
  return useQuery({
    queryKey: supplierKeys.list(params),
    queryFn: () => listSuppliers(params),
  });
}

export function useSupplierQuery(id: string | undefined) {
  return useQuery({
    queryKey: supplierKeys.detail(id ?? ""),
    queryFn: () => getSupplier(id!),
    enabled: Boolean(id),
  });
}

export function useSupplierStatsQuery() {
  return useQuery({
    queryKey: supplierKeys.stats(),
    queryFn: () => getSupplierStats(),
  });
}

export function useCreateSupplierMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateSupplierInput) => createSupplier(body),
    onSuccess: async () => {
      await invalidateSupplierQueries(queryClient);
    },
  });
}

export function useUpdateSupplierMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateSupplierInput) => updateSupplier(id, body),
    onSuccess: async (supplier) => {
      await invalidateSupplierQueries(queryClient, id);
      queryClient.setQueryData(supplierKeys.detail(id), supplier);
    },
  });
}

export function useDeleteSupplierMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSupplier(id),
    onSuccess: async (_data, id) => {
      await invalidateSupplierQueries(queryClient);
      queryClient.removeQueries({ queryKey: supplierKeys.detail(id) });
    },
  });
}

function useSupplierFileMutation(
  supplierId: string,
  mutationFn: (files: AttachmentInput[]) => Promise<import("../types").Supplier>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async (supplier) => {
      await invalidateSupplierQueries(queryClient, supplierId);
      queryClient.setQueryData(supplierKeys.detail(supplierId), supplier);
    },
  });
}

function useSupplierRemoveFileMutation(
  supplierId: string,
  mutationFn: (fileId: string) => Promise<import("../types").Supplier>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async (supplier) => {
      await invalidateSupplierQueries(queryClient, supplierId);
      queryClient.setQueryData(supplierKeys.detail(supplierId), supplier);
    },
  });
}

export function useAddSupplierSlaFilesMutation(supplierId: string) {
  return useSupplierFileMutation(supplierId, (files) =>
    addSupplierSlaFiles(supplierId, files)
  );
}

export function useRemoveSupplierSlaFileMutation(supplierId: string) {
  return useSupplierRemoveFileMutation(supplierId, (fileId) =>
    removeSupplierSlaFile(supplierId, fileId)
  );
}

export function useAddSupplierContractFilesMutation(supplierId: string) {
  return useSupplierFileMutation(supplierId, (files) =>
    addSupplierContractFiles(supplierId, files)
  );
}

export function useRemoveSupplierContractFileMutation(supplierId: string) {
  return useSupplierRemoveFileMutation(supplierId, (fileId) =>
    removeSupplierContractFile(supplierId, fileId)
  );
}

export function useAddSupplierOnboardingFilesMutation(supplierId: string) {
  return useSupplierFileMutation(supplierId, (files) =>
    addSupplierOnboardingFiles(supplierId, files)
  );
}

export function useRemoveSupplierOnboardingFileMutation(supplierId: string) {
  return useSupplierRemoveFileMutation(supplierId, (fileId) =>
    removeSupplierOnboardingFile(supplierId, fileId)
  );
}

export function useAddSupplierKpiMutation(supplierId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (value: string) => addSupplierKpiObjective(supplierId, value),
    onSuccess: async (supplier) => {
      await invalidateSupplierQueries(queryClient, supplierId);
      queryClient.setQueryData(supplierKeys.detail(supplierId), supplier);
    },
  });
}

export function useRemoveSupplierKpiMutation(supplierId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (kpiId: string) =>
      removeSupplierKpiObjective(supplierId, kpiId),
    onSuccess: async (supplier) => {
      await invalidateSupplierQueries(queryClient, supplierId);
      queryClient.setQueryData(supplierKeys.detail(supplierId), supplier);
    },
  });
}
