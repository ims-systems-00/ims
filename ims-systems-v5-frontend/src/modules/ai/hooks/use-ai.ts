import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { activityKeys } from "@/modules/activities";
import {
  createAiChatThread,
  createAiResponse,
  deleteAiChatThread,
  deleteAiResponse,
  getAiChatThread,
  getAiResponse,
  listAiChatThreads,
  listAiResponses,
  updateAiResponse,
} from "../api/ai";
import type {
  AiSourceModuleType,
  CreateAiResponseInput,
  ListAiResponsesParams,
  UpdateAiResponseInput,
} from "../types";

const HISTORY_PAGE_SIZE = 50;

export const aiKeys = {
  all: ["ai"] as const,
  lists: () => [...aiKeys.all, "list"] as const,
  list: (params: ListAiResponsesParams) =>
    [...aiKeys.lists(), params] as const,
  infiniteForSource: (moduleType: AiSourceModuleType, moduleId: string) =>
    [...aiKeys.lists(), "infinite", moduleType, moduleId] as const,
  details: () => [...aiKeys.all, "detail"] as const,
  detail: (id: string) => [...aiKeys.details(), id] as const,
  forSource: (moduleType: AiSourceModuleType, moduleId: string) =>
    aiKeys.list({
      page: 1,
      pageSize: HISTORY_PAGE_SIZE,
      moduleType,
      moduleId,
      sortDir: "desc",
    }),
  chatThreads: () => [...aiKeys.all, "chat-threads"] as const,
  chatThread: (id: string) => [...aiKeys.all, "chat-thread", id] as const,
};

function invalidateAiAndActivity(
  queryClient: ReturnType<typeof useQueryClient>,
  moduleType?: string,
  moduleId?: string
) {
  void queryClient.invalidateQueries({ queryKey: aiKeys.lists() });
  void queryClient.invalidateQueries({
    queryKey: activityKeys.lists(),
    predicate: (query) => {
      if (!moduleType || !moduleId) return true;
      const params = query.queryKey[2] as
        | { moduleType?: string; moduleId?: string }
        | undefined;
      return (
        params?.moduleType === moduleType && params?.moduleId === moduleId
      );
    },
  });
}

/** Flat first-page list (legacy callers). Prefer infinite query for history UI. */
export function useAiResponsesForSourceQuery(
  moduleType: AiSourceModuleType | undefined,
  moduleId: string | undefined,
  enabled = true
) {
  const params: ListAiResponsesParams = {
    page: 1,
    pageSize: HISTORY_PAGE_SIZE,
    moduleType,
    moduleId,
    sortDir: "desc",
  };
  return useQuery({
    queryKey: aiKeys.list(params),
    queryFn: () => listAiResponses(params),
    enabled: Boolean(enabled && moduleType && moduleId),
  });
}

/** Paginated history for Analytical Assistant (load more beyond page 1). */
export function useAiResponsesForSourceInfiniteQuery(
  moduleType: AiSourceModuleType | undefined,
  moduleId: string | undefined,
  enabled = true
) {
  return useInfiniteQuery({
    queryKey:
      moduleType && moduleId
        ? aiKeys.infiniteForSource(moduleType, moduleId)
        : [...aiKeys.lists(), "infinite", "idle"],
    queryFn: ({ pageParam }) =>
      listAiResponses({
        page: pageParam,
        pageSize: HISTORY_PAGE_SIZE,
        moduleType,
        moduleId,
        sortDir: "desc",
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.page >= lastPage.totalPages || lastPage.totalPages === 0) {
        return undefined;
      }
      return lastPage.page + 1;
    },
    enabled: Boolean(enabled && moduleType && moduleId),
  });
}

export function useAiResponseQuery(id: string | undefined) {
  return useQuery({
    queryKey: aiKeys.detail(id ?? ""),
    queryFn: () => getAiResponse(id!),
    enabled: Boolean(id),
  });
}

export function useCreateAiResponseMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAiResponseInput) => createAiResponse(input),
    onSuccess: (data) => {
      invalidateAiAndActivity(
        queryClient,
        data.source.moduleType,
        data.source.moduleId
      );
      queryClient.setQueryData(aiKeys.detail(data.id), data);
    },
  });
}

export function useUpdateAiResponseMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateAiResponseInput) => updateAiResponse(id, input),
    onSuccess: (data) => {
      invalidateAiAndActivity(
        queryClient,
        data.source.moduleType,
        data.source.moduleId
      );
      queryClient.setQueryData(aiKeys.detail(data.id), data);
    },
  });
}

export function useDeleteAiResponseMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAiResponse(id),
    onSuccess: (data) => {
      invalidateAiAndActivity(
        queryClient,
        data.source.moduleType,
        data.source.moduleId
      );
    },
  });
}

export function useAiChatThreadsQuery(enabled = true) {
  return useQuery({
    queryKey: aiKeys.chatThreads(),
    queryFn: listAiChatThreads,
    enabled,
  });
}

export function useAiChatThreadQuery(id: string | undefined) {
  return useQuery({
    queryKey: aiKeys.chatThread(id ?? ""),
    queryFn: () => getAiChatThread(id!),
    enabled: Boolean(id),
  });
}

export function useCreateAiChatThreadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body?: {
      title?: string;
      pinnedRecords?: Array<{ module: string; id: string }>;
    }) => createAiChatThread(body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: aiKeys.chatThreads() });
    },
  });
}

export function useDeleteAiChatThreadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAiChatThread(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: aiKeys.chatThreads() });
    },
  });
}
