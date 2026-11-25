import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  confirmInventorySighting,
  createInventoryAsset,
  createInventoryStock,
  getComplianceMap,
  getInventoryAsset,
  getInventoryCategories,
  getInventoryOverview,
  getInventorySettings,
  getPublicScanSnapshot,
  listInventoryAssets,
  listInventoryCalibrationLabs,
  listInventorySchedule,
  listInventoryStock,
  markInventoryLabelled,
  moveInventoryLocation,
  moveInventoryStage,
  moveInventoryStock,
  publicScanAction,
  recordInventoryCheck,
  recordInventoryEachUse,
  reportInventoryFault,
  updateInventoryAsset,
  updateInventorySettings,
  updateInventoryStock,
} from "../api/inventory";
import type {
  ConfirmSightingInput,
  CreateInventoryAssetInput,
  CreateStockItemInput,
  ListInventoryAssetsParams,
  ListScheduleParams,
  MoveLocationInput,
  MoveStageInput,
  RecordCheckInput,
  RecordEachUseInput,
  ReportFaultInput,
  StockMoveInput,
  UpdateInventoryAssetInput,
  UpdateInventorySettingsInput,
  UpdateStockItemInput,
} from "../types";

export const inventoryKeys = {
  all: ["inventory"] as const,
  lists: () => [...inventoryKeys.all, "list"] as const,
  list: (params: ListInventoryAssetsParams) =>
    [...inventoryKeys.lists(), params] as const,
  details: () => [...inventoryKeys.all, "detail"] as const,
  detail: (id: string) => [...inventoryKeys.details(), id] as const,
  overview: () => [...inventoryKeys.all, "overview"] as const,
  categories: () => [...inventoryKeys.all, "categories"] as const,
  settings: () => [...inventoryKeys.all, "settings"] as const,
  schedule: (params: ListScheduleParams) =>
    [...inventoryKeys.all, "schedule", params] as const,
  stock: () => [...inventoryKeys.all, "stock"] as const,
  compliance: () => [...inventoryKeys.all, "compliance"] as const,
  calibrationLabs: () => [...inventoryKeys.all, "calibration-labs"] as const,
  publicScan: (orgId: string, tag: string) =>
    [...inventoryKeys.all, "public", orgId, tag] as const,
};

const HUB_REFETCH_MS = 20_000;

async function invalidateInventory(
  queryClient: ReturnType<typeof useQueryClient>,
  id?: string
) {
  await queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() });
  await queryClient.invalidateQueries({ queryKey: inventoryKeys.overview() });
  await queryClient.invalidateQueries({
    queryKey: [...inventoryKeys.all, "schedule"],
  });
  await queryClient.invalidateQueries({ queryKey: inventoryKeys.stock() });
  if (id) {
    await queryClient.invalidateQueries({
      queryKey: inventoryKeys.detail(id),
    });
  }
}

export function useInventoryAssetsQuery(params: ListInventoryAssetsParams) {
  return useQuery({
    queryKey: inventoryKeys.list(params),
    queryFn: () => listInventoryAssets(params),
    refetchInterval: HUB_REFETCH_MS,
    refetchOnWindowFocus: true,
  });
}

export function useInventoryAssetQuery(id: string | undefined) {
  return useQuery({
    queryKey: inventoryKeys.detail(id ?? ""),
    queryFn: () => getInventoryAsset(id!),
    enabled: Boolean(id),
  });
}

export function useInventoryOverviewQuery() {
  return useQuery({
    queryKey: inventoryKeys.overview(),
    queryFn: () => getInventoryOverview(),
    refetchInterval: HUB_REFETCH_MS,
    refetchOnWindowFocus: true,
  });
}

export function useInventoryCategoriesQuery() {
  return useQuery({
    queryKey: inventoryKeys.categories(),
    queryFn: () => getInventoryCategories(),
  });
}

export function useInventorySettingsQuery() {
  return useQuery({
    queryKey: inventoryKeys.settings(),
    queryFn: () => getInventorySettings(),
  });
}

export function useInventoryScheduleQuery(params: ListScheduleParams = {}) {
  return useQuery({
    queryKey: inventoryKeys.schedule(params),
    queryFn: () => listInventorySchedule(params),
    refetchInterval: HUB_REFETCH_MS,
    refetchOnWindowFocus: true,
  });
}

export function useInventoryStockQuery() {
  return useQuery({
    queryKey: inventoryKeys.stock(),
    queryFn: () => listInventoryStock(),
    refetchInterval: HUB_REFETCH_MS,
    refetchOnWindowFocus: true,
  });
}

export function useInventoryCalibrationLabsQuery(enabled = true) {
  return useQuery({
    queryKey: inventoryKeys.calibrationLabs(),
    queryFn: () => listInventoryCalibrationLabs(),
    enabled,
  });
}

export function useComplianceMapQuery() {
  return useQuery({
    queryKey: inventoryKeys.compliance(),
    queryFn: () => getComplianceMap(),
  });
}

export function usePublicScanQuery(organizationId?: string, tag?: string) {
  return useQuery({
    queryKey: inventoryKeys.publicScan(organizationId ?? "", tag ?? ""),
    queryFn: () => getPublicScanSnapshot(organizationId!, tag!),
    enabled: Boolean(organizationId && tag),
  });
}

export function useCreateInventoryAssetMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateInventoryAssetInput) => createInventoryAsset(body),
    onSuccess: async () => invalidateInventory(queryClient),
  });
}

export function useUpdateInventoryAssetMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateInventoryAssetInput) =>
      updateInventoryAsset(id, body),
    onSuccess: async (asset) => {
      await invalidateInventory(queryClient, id);
      queryClient.setQueryData(inventoryKeys.detail(id), asset);
    },
  });
}

export function useMoveInventoryStageMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: MoveStageInput) => moveInventoryStage(id, body),
    onSuccess: async (asset) => {
      await invalidateInventory(queryClient, id);
      queryClient.setQueryData(inventoryKeys.detail(id), asset);
    },
  });
}

export function useRecordInventoryCheckMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: RecordCheckInput) => recordInventoryCheck(id, body),
    onSuccess: async (result) => {
      const { incidentId: _incidentId, ...asset } = result;
      await invalidateInventory(queryClient, id);
      queryClient.setQueryData(inventoryKeys.detail(id), asset);
    },
  });
}

export function useReportInventoryFaultMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ReportFaultInput) => reportInventoryFault(id, body),
    onSuccess: async (result) => {
      const { incidentId: _incidentId, ...asset } = result;
      await invalidateInventory(queryClient, id);
      queryClient.setQueryData(inventoryKeys.detail(id), asset);
    },
  });
}

export function useMoveInventoryLocationMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: MoveLocationInput) => moveInventoryLocation(id, body),
    onSuccess: async (asset) => {
      await invalidateInventory(queryClient, id);
      queryClient.setQueryData(inventoryKeys.detail(id), asset);
    },
  });
}

export function useConfirmInventorySightingMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ConfirmSightingInput) =>
      confirmInventorySighting(id, body),
    onSuccess: async (asset) => {
      await invalidateInventory(queryClient, id);
      queryClient.setQueryData(inventoryKeys.detail(id), asset);
    },
  });
}

export function useRecordInventoryEachUseMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: RecordEachUseInput) => recordInventoryEachUse(id, body),
    onSuccess: async (asset) => {
      await invalidateInventory(queryClient, id);
      queryClient.setQueryData(inventoryKeys.detail(id), asset);
    },
  });
}

export function useMarkInventoryLabelledMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => markInventoryLabelled(ids),
    onSuccess: async () => invalidateInventory(queryClient),
  });
}

export function useUpdateInventorySettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateInventorySettingsInput) =>
      updateInventorySettings(body),
    onSuccess: async (settings) => {
      queryClient.setQueryData(inventoryKeys.settings(), settings);
      await queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
    },
  });
}

export function useCreateInventoryStockMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateStockItemInput) => createInventoryStock(body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: inventoryKeys.stock() });
      await queryClient.invalidateQueries({
        queryKey: inventoryKeys.overview(),
      });
    },
  });
}

export function useUpdateInventoryStockMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateStockItemInput) => updateInventoryStock(id, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: inventoryKeys.stock() });
    },
  });
}

export function useMoveInventoryStockMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: StockMoveInput) => moveInventoryStock(id, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: inventoryKeys.stock() });
      await queryClient.invalidateQueries({
        queryKey: inventoryKeys.overview(),
      });
    },
  });
}

export function usePublicScanActionMutation(
  organizationId: string,
  tag: string
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      action: "fault" | "each-use" | "move" | "sighting" | "checks";
      body: Record<string, unknown>;
      scanName: string;
    }) =>
      publicScanAction(
        organizationId,
        tag,
        input.action,
        input.body,
        input.scanName
      ),
    onSuccess: (snap) => {
      queryClient.setQueryData(
        inventoryKeys.publicScan(organizationId, tag),
        snap
      );
    },
  });
}
