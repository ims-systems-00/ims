import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  acceptTask,
  completeTask,
  createTask,
  declineTask,
  deleteTask,
  getTask,
  getTopTaskAnalytics,
  listTasks,
  nudgeTask,
  removeTaskAttachment,
  updateTask,
} from "../api/tasks";
import type {
  CreateTaskInput,
  ListTasksParams,
  UpdateTaskInput,
} from "../types";

export const taskKeys = {
  all: ["tasks"] as const,
  lists: () => [...taskKeys.all, "list"] as const,
  list: (params: ListTasksParams) => [...taskKeys.lists(), params] as const,
  details: () => [...taskKeys.all, "detail"] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
  analytics: () => [...taskKeys.all, "analytics", "top"] as const,
};

async function invalidateTaskQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  id?: string
) {
  await queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
  await queryClient.invalidateQueries({ queryKey: taskKeys.analytics() });
  if (id) {
    await queryClient.invalidateQueries({ queryKey: taskKeys.detail(id) });
  }
}

export function useTasksQuery(params: ListTasksParams) {
  return useQuery({
    queryKey: taskKeys.list(params),
    queryFn: () => listTasks(params),
  });
}

export function useTaskQuery(id: string | undefined) {
  return useQuery({
    queryKey: taskKeys.detail(id ?? ""),
    queryFn: () => getTask(id!),
    enabled: Boolean(id),
  });
}

export function useTopTaskAnalyticsQuery(enabled = true) {
  return useQuery({
    queryKey: taskKeys.analytics(),
    queryFn: () => getTopTaskAnalytics(),
    enabled,
  });
}

export function useCreateTaskMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTaskInput) => createTask(body),
    onSuccess: async () => {
      await invalidateTaskQueries(queryClient);
    },
  });
}

export function useUpdateTaskMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateTaskInput) => updateTask(id, body),
    onSuccess: async (task) => {
      await invalidateTaskQueries(queryClient, id);
      queryClient.setQueryData(taskKeys.detail(id), task);
    },
  });
}

export function useDeleteTaskMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSuccess: async (_data, id) => {
      await invalidateTaskQueries(queryClient);
      queryClient.removeQueries({ queryKey: taskKeys.detail(id) });
    },
  });
}

function useTaskLifecycleMutation(
  mutationFn: (id: string) => Promise<import("../types").Task>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async (task) => {
      await invalidateTaskQueries(queryClient, task.id);
      queryClient.setQueryData(taskKeys.detail(task.id), task);
    },
  });
}

export function useAcceptTaskMutation() {
  return useTaskLifecycleMutation(acceptTask);
}

export function useDeclineTaskMutation() {
  return useTaskLifecycleMutation(declineTask);
}

export function useCompleteTaskMutation() {
  return useTaskLifecycleMutation(completeTask);
}

export function useNudgeTaskMutation() {
  return useTaskLifecycleMutation(nudgeTask);
}

export function useRemoveTaskAttachmentMutation(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: string) =>
      removeTaskAttachment(taskId, attachmentId),
    onSuccess: async (task) => {
      await invalidateTaskQueries(queryClient, taskId);
      queryClient.setQueryData(taskKeys.detail(taskId), task);
    },
  });
}
