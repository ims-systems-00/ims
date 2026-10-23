import { apiRequest } from "@/shared/lib/http";
import type {
  CreateLeaveInput,
  Leave,
  LeaveDecision,
  LeaveHolidaysResult,
  ListLeavesParams,
  PaginatedLeaves,
  UpdateLeaveInput,
} from "../types";

export function listLeaves(
  params: ListLeavesParams = {}
): Promise<PaginatedLeaves> {
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  if (params.pageSize) q.set("pageSize", String(params.pageSize));
  if (params.scope) q.set("scope", params.scope);
  if (params.status) q.set("status", params.status);
  if (params.type) q.set("type", params.type);
  if (params.search) q.set("search", params.search);
  if (params.sortDir) q.set("sortDir", params.sortDir);
  const qs = q.toString();
  return apiRequest<PaginatedLeaves>(`/leaves${qs ? `?${qs}` : ""}`);
}

export function getLeave(id: string): Promise<Leave> {
  return apiRequest<Leave>(`/leaves/${encodeURIComponent(id)}`);
}

export function createLeave(input: CreateLeaveInput): Promise<Leave> {
  return apiRequest<Leave>("/leaves", { method: "POST", body: input });
}

export function updateLeave(
  id: string,
  input: UpdateLeaveInput
): Promise<Leave> {
  return apiRequest<Leave>(`/leaves/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: input,
  });
}

export function deleteLeave(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(
    `/leaves/${encodeURIComponent(id)}`,
    { method: "DELETE" }
  );
}

export function submitLeave(id: string): Promise<Leave> {
  return apiRequest<Leave>(`/leaves/${encodeURIComponent(id)}/submit`, {
    method: "POST",
    body: {},
  });
}

export function evaluateLeave(
  id: string,
  status: LeaveDecision
): Promise<Leave> {
  return apiRequest<Leave>(`/leaves/${encodeURIComponent(id)}/evaluate`, {
    method: "POST",
    body: { status },
  });
}

export function listLeaveHolidays(
  params: { year?: number; countryCode?: string } = {}
): Promise<LeaveHolidaysResult> {
  const q = new URLSearchParams();
  if (params.year) q.set("year", String(params.year));
  if (params.countryCode) q.set("countryCode", params.countryCode);
  const qs = q.toString();
  return apiRequest<LeaveHolidaysResult>(
    `/leaves/holidays${qs ? `?${qs}` : ""}`
  );
}
