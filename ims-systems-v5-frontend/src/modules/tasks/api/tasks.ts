import { apiRequest } from "@/shared/lib/http";
import type {
  CreateTaskInput,
  ListTasksParams,
  PaginatedTasks,
  Task,
  TopTaskAnalytics,
  UpdateTaskInput,
} from "../types";

function toQuery(params: ListTasksParams = {}): string {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.pageSize) search.set("pageSize", String(params.pageSize));
  if (params.search) search.set("search", params.search);
  if (params.statusPreset) search.set("statusPreset", params.statusPreset);
  if (params.priority) search.set("priority", params.priority);
  if (params.assigneeId) search.set("assigneeId", params.assigneeId);
  if (params.dueBefore) search.set("dueBefore", params.dueBefore);
  if (params.sourceModuleType) {
    search.set("sourceModuleType", params.sourceModuleType);
  }
  if (params.sourceModuleId) search.set("sourceModuleId", params.sourceModuleId);
  if (params.sort) search.set("sort", params.sort);
  if (params.sortDir) search.set("sortDir", params.sortDir);
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function listTasks(params?: ListTasksParams): Promise<PaginatedTasks> {
  return apiRequest<PaginatedTasks>(`/tasks${toQuery(params)}`);
}

export function getTask(id: string): Promise<Task> {
  return apiRequest<Task>(`/tasks/${id}`);
}

export function getTopTaskAnalytics(): Promise<TopTaskAnalytics> {
  return apiRequest<TopTaskAnalytics>("/tasks/analytics/top");
}

export function createTask(body: CreateTaskInput): Promise<Task> {
  return apiRequest<Task>("/tasks", { method: "POST", body });
}

export function updateTask(id: string, body: UpdateTaskInput): Promise<Task> {
  return apiRequest<Task>(`/tasks/${id}`, { method: "PATCH", body });
}

export function deleteTask(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/tasks/${id}`, { method: "DELETE" });
}

export function acceptTask(id: string): Promise<Task> {
  return apiRequest<Task>(`/tasks/${id}/accept`, { method: "POST" });
}

export function declineTask(id: string): Promise<Task> {
  return apiRequest<Task>(`/tasks/${id}/decline`, { method: "POST" });
}

export function completeTask(id: string): Promise<Task> {
  return apiRequest<Task>(`/tasks/${id}/complete`, { method: "POST" });
}

export function nudgeTask(id: string): Promise<Task> {
  return apiRequest<Task>(`/tasks/${id}/nudge`, { method: "POST" });
}

export function removeTaskAttachment(
  id: string,
  attachmentId: string
): Promise<Task> {
  return apiRequest<Task>(`/tasks/${id}/attachments/${attachmentId}`, {
    method: "DELETE",
  });
}
