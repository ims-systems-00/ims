import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addSoftwareDocument,
  addSoftwareKey,
  createHardware,
  createInformation,
  createPeople,
  createPremise,
  createSoftware,
  deleteAsset,
  getAsset,
  listAssets,
  removeSoftwareDocument,
  removeSoftwareKey,
  updateHardware,
  updateInformation,
  updatePeople,
  updatePremise,
  updateSoftware,
} from "../api/assets";
import type {
  AssetCategory,
  CreateHardwareInput,
  CreateInformationInput,
  CreatePeopleInput,
  CreatePremiseInput,
  CreateSoftwareInput,
  HardwareAsset,
  InformationAsset,
  ListAssetsParams,
  PeopleAsset,
  PremiseAsset,
  SoftwareAsset,
  UpdateHardwareInput,
  UpdateInformationInput,
  UpdatePeopleInput,
  UpdatePremiseInput,
  UpdateSoftwareInput,
} from "../types";

export const assetKeys = {
  all: ["assets"] as const,
  lists: (category: AssetCategory) =>
    [...assetKeys.all, category, "list"] as const,
  list: (category: AssetCategory, params: ListAssetsParams) =>
    [...assetKeys.lists(category), params] as const,
  details: (category: AssetCategory) =>
    [...assetKeys.all, category, "detail"] as const,
  detail: (category: AssetCategory, id: string) =>
    [...assetKeys.details(category), id] as const,
};

export function useAssetsQuery(
  category: AssetCategory,
  params: ListAssetsParams
) {
  return useQuery({
    queryKey: assetKeys.list(category, params),
    queryFn: () => listAssets(category, params),
  });
}

export function useAssetQuery(category: AssetCategory, id: string | undefined) {
  return useQuery({
    queryKey: assetKeys.detail(category, id ?? ""),
    queryFn: () => getAsset(category, id!),
    enabled: Boolean(id),
  });
}

export function useCreateHardwareMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateHardwareInput) => createHardware(body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: assetKeys.lists("hardware"),
      });
    },
  });
}

export function useUpdateHardwareMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateHardwareInput) => updateHardware(id, body),
    onSuccess: async (asset) => {
      await queryClient.invalidateQueries({
        queryKey: assetKeys.lists("hardware"),
      });
      queryClient.setQueryData(assetKeys.detail("hardware", id), asset);
    },
  });
}

export function useCreateSoftwareMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateSoftwareInput) => createSoftware(body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: assetKeys.lists("software"),
      });
    },
  });
}

export function useUpdateSoftwareMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateSoftwareInput) => updateSoftware(id, body),
    onSuccess: async (asset) => {
      await queryClient.invalidateQueries({
        queryKey: assetKeys.lists("software"),
      });
      queryClient.setQueryData(assetKeys.detail("software", id), asset);
    },
  });
}

export function useCreatePeopleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreatePeopleInput) => createPeople(body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: assetKeys.lists("people"),
      });
    },
  });
}

export function useUpdatePeopleMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdatePeopleInput) => updatePeople(id, body),
    onSuccess: async (asset) => {
      await queryClient.invalidateQueries({
        queryKey: assetKeys.lists("people"),
      });
      queryClient.setQueryData(assetKeys.detail("people", id), asset);
    },
  });
}

export function useCreatePremiseMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreatePremiseInput) => createPremise(body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: assetKeys.lists("premise"),
      });
    },
  });
}

export function useUpdatePremiseMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdatePremiseInput) => updatePremise(id, body),
    onSuccess: async (asset) => {
      await queryClient.invalidateQueries({
        queryKey: assetKeys.lists("premise"),
      });
      queryClient.setQueryData(assetKeys.detail("premise", id), asset);
    },
  });
}

export function useCreateInformationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateInformationInput) => createInformation(body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: assetKeys.lists("information"),
      });
    },
  });
}

export function useUpdateInformationMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateInformationInput) => updateInformation(id, body),
    onSuccess: async (asset) => {
      await queryClient.invalidateQueries({
        queryKey: assetKeys.lists("information"),
      });
      queryClient.setQueryData(assetKeys.detail("information", id), asset);
    },
  });
}

export function useDeleteAssetMutation(category: AssetCategory) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAsset(category, id),
    onSuccess: async (_data, id) => {
      await queryClient.invalidateQueries({
        queryKey: assetKeys.lists(category),
      });
      queryClient.removeQueries({
        queryKey: assetKeys.detail(category, id),
      });
    },
  });
}

export function useAddSoftwareKeyMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (value: string) => addSoftwareKey(id, value),
    onSuccess: async (asset) => {
      await queryClient.invalidateQueries({
        queryKey: assetKeys.lists("software"),
      });
      queryClient.setQueryData(assetKeys.detail("software", id), asset);
    },
  });
}

export function useRemoveSoftwareKeyMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (keyId: string) => removeSoftwareKey(id, keyId),
    onSuccess: async (asset) => {
      await queryClient.invalidateQueries({
        queryKey: assetKeys.lists("software"),
      });
      queryClient.setQueryData(assetKeys.detail("software", id), asset);
    },
  });
}

export function useAddSoftwareDocumentMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (document: {
      fileName: string;
      mimeType?: string;
      sizeBytes?: number;
      storageKey?: string;
    }) => addSoftwareDocument(id, document),
    onSuccess: async (asset) => {
      await queryClient.invalidateQueries({
        queryKey: assetKeys.lists("software"),
      });
      queryClient.setQueryData(assetKeys.detail("software", id), asset);
    },
  });
}

export function useRemoveSoftwareDocumentMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) => removeSoftwareDocument(id, documentId),
    onSuccess: async (asset) => {
      await queryClient.invalidateQueries({
        queryKey: assetKeys.lists("software"),
      });
      queryClient.setQueryData(assetKeys.detail("software", id), asset);
    },
  });
}

export type {
  HardwareAsset,
  SoftwareAsset,
  PeopleAsset,
  PremiseAsset,
  InformationAsset,
};
