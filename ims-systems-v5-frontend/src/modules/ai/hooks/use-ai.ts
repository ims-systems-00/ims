import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  createAiResponse,
  deleteAiResponse,
  getAiResponse,
  listAiResponses,
  updateAiResponse,
} from "../api/ai";
import type {
  AiSourceModuleType,
  CreateAiResponseInput,
  ListAiResponsesParams,
  UpdateAiResponseInput,
} from "../types";

export const aiKeys = {
  all: ["ai"] as const,
  lists: () => [...aiKeys.all, "list"] as const,
  list: (params: ListAiResponsesParams) =>
    [...aiKeys.lists(), params] as const,
  details: () => [...aiKeys.all, "detail"] as const,
  detail: (id: string) => [...aiKeys.details(), id] as const,
  forSource: (moduleType: AiSourceModuleType, moduleId: string) =>
    aiKeys.list({
      page: 1,
      pageSize: 50,
      moduleType,
      moduleId,
      sortDir: "desc",
    }),
};

export function useAiResponsesForSourceQuery(
  moduleType: AiSourceModuleType | undefined,
  moduleId: string | undefined,
  enabled = true
) {
  const params: ListAiResponsesParams = {
    page: 1,
    pageSize: 50,
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
      void queryClient.invalidateQueries({ queryKey: aiKeys.lists() });
      queryClient.setQueryData(aiKeys.detail(data.id), data);
    },
  });
}

export function useUpdateAiResponseMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateAiResponseInput) => updateAiResponse(id, input),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: aiKeys.lists() });
      queryClient.setQueryData(aiKeys.detail(data.id), data);
    },
  });
}

export function useDeleteAiResponseMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAiResponse(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: aiKeys.lists() });
    },
  });
}
