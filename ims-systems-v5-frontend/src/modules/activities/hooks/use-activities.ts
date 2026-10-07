import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createActivity,
  deleteActivity,
  listActivities,
  updateActivity,
} from "../api/activities";
import type {
  CreateActivityInput,
  ListActivitiesParams,
  UpdateActivityInput,
} from "../types";

export const activityKeys = {
  all: ["activities"] as const,
  lists: () => [...activityKeys.all, "list"] as const,
  list: (params: ListActivitiesParams) =>
    [...activityKeys.lists(), params] as const,
};

async function invalidateActivityLists(
  queryClient: ReturnType<typeof useQueryClient>,
  moduleType?: string,
  moduleId?: string
) {
  await queryClient.invalidateQueries({
    queryKey: activityKeys.lists(),
    predicate: (query) => {
      if (!moduleType || !moduleId) return true;
      const params = query.queryKey[2] as ListActivitiesParams | undefined;
      return (
        params?.moduleType === moduleType && params?.moduleId === moduleId
      );
    },
  });
}

export function useActivitiesQuery(
  params: ListActivitiesParams,
  enabled = true
) {
  return useQuery({
    queryKey: activityKeys.list(params),
    queryFn: () => listActivities(params),
    enabled: enabled && Boolean(params.moduleId),
  });
}

export function useCreateActivityMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateActivityInput) => createActivity(body),
    onSuccess: async (created) => {
      await invalidateActivityLists(
        queryClient,
        created.moduleType,
        created.moduleId
      );
    },
  });
}

export function useUpdateActivityMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: UpdateActivityInput;
    }) => updateActivity(id, body),
    onSuccess: async (updated) => {
      await invalidateActivityLists(
        queryClient,
        updated.moduleType,
        updated.moduleId
      );
    },
  });
}

export function useDeleteActivityMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteActivity(id),
    onSuccess: async (deleted) => {
      await invalidateActivityLists(
        queryClient,
        deleted.moduleType,
        deleted.moduleId
      );
    },
  });
}
