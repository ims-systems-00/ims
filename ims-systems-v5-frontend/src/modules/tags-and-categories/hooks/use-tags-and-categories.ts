import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createTagAndCategory,
  deleteTagAndCategory,
  getTagAndCategory,
  listTagsAndCategories,
  updateTagAndCategory,
} from "../api/tags-and-categories";
import type {
  CreateTagAndCategoryInput,
  ListTagsAndCategoriesParams,
  UpdateTagAndCategoryInput,
} from "../types";

export const tagsAndCategoriesKeys = {
  all: ["tags-and-categories"] as const,
  lists: () => [...tagsAndCategoriesKeys.all, "list"] as const,
  list: (params: ListTagsAndCategoriesParams) =>
    [...tagsAndCategoriesKeys.lists(), params] as const,
  details: () => [...tagsAndCategoriesKeys.all, "detail"] as const,
  detail: (id: string) => [...tagsAndCategoriesKeys.details(), id] as const,
};

async function invalidateLists(
  queryClient: ReturnType<typeof useQueryClient>
) {
  await queryClient.invalidateQueries({
    queryKey: tagsAndCategoriesKeys.lists(),
  });
}

export function useTagsAndCategoriesQuery(params: ListTagsAndCategoriesParams) {
  return useQuery({
    queryKey: tagsAndCategoriesKeys.list(params),
    queryFn: () => listTagsAndCategories(params),
  });
}

export function useTagAndCategoryQuery(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: tagsAndCategoriesKeys.detail(id ?? ""),
    queryFn: () => getTagAndCategory(id!),
    enabled: Boolean(id) && enabled,
  });
}

export function useCreateTagAndCategoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTagAndCategoryInput) => createTagAndCategory(body),
    onSuccess: async () => {
      await invalidateLists(queryClient);
    },
  });
}

export function useUpdateTagAndCategoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: UpdateTagAndCategoryInput;
    }) => updateTagAndCategory(id, body),
    onSuccess: async (tag) => {
      await invalidateLists(queryClient);
      queryClient.setQueryData(tagsAndCategoriesKeys.detail(tag.id), tag);
    },
  });
}

export function useDeleteTagAndCategoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTagAndCategory(id),
    onSuccess: async (_tag, id) => {
      await invalidateLists(queryClient);
      queryClient.removeQueries({
        queryKey: tagsAndCategoriesKeys.detail(id),
      });
    },
  });
}
