import { apiRequest } from "@/shared/lib/http";
import type {
  Activity,
  CreateActivityInput,
  ListActivitiesParams,
  PaginatedActivities,
  UpdateActivityInput,
} from "../types";

function toQuery(params: ListActivitiesParams): string {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.pageSize) search.set("pageSize", String(params.pageSize));
  search.set("moduleType", params.moduleType);
  search.set("moduleId", params.moduleId);
  if (params.isAutomated !== undefined) {
    search.set("isAutomated", String(params.isAutomated));
  }
  if (params.threadId) search.set("threadId", params.threadId);
  if (params.sort) search.set("sort", params.sort);
  if (params.sortDir) search.set("sortDir", params.sortDir);
  return `?${search.toString()}`;
}

export function listActivities(
  params: ListActivitiesParams
): Promise<PaginatedActivities> {
  return apiRequest<PaginatedActivities>(`/activities${toQuery(params)}`);
}

export function getActivity(id: string): Promise<Activity> {
  return apiRequest<Activity>(`/activities/${id}`);
}

export function createActivity(body: CreateActivityInput): Promise<Activity> {
  return apiRequest<Activity>("/activities", {
    method: "POST",
    body,
  });
}

export function updateActivity(
  id: string,
  body: UpdateActivityInput
): Promise<Activity> {
  return apiRequest<Activity>(`/activities/${id}`, {
    method: "PATCH",
    body,
  });
}

export function deleteActivity(id: string): Promise<Activity> {
  return apiRequest<Activity>(`/activities/${id}`, {
    method: "DELETE",
  });
}
